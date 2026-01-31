import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clearDocumentScrollLocks, isAnyOverlayOpen } from '@/lib/scrollLock';

interface ScrollState {
  // Body styles (inline)
  bodyOverflow: string;
  bodyOverflowY: string;
  bodyPosition: string;
  bodyTop: string;
  bodyPaddingRight: string;
  bodyPointerEvents: string;
  bodyScrollLocked: string | null;
  bodyOverflowHidden: boolean;
  
  // Body computed styles
  bodyComputedOverflow: string;
  bodyComputedOverflowY: string;
  bodyComputedPosition: string;
  
  // Html styles (inline)
  htmlOverflow: string;
  htmlScrollLocked: string | null;
  htmlOverflowHidden: boolean;
  
  // Html computed styles
  htmlComputedOverflow: string;
  htmlComputedOverflowY: string;
  
  // Scroll metrics
  innerHeight: number;
  scrollHeight: number;
  scrollY: number;
  
  // Overlay detection
  isOverlayOpen: boolean;
  dialogCount: number;
  radixOverlayCount: number;
  vaulDrawerCount: number;
}

function getScrollState(): ScrollState {
  const body = document.body;
  const html = document.documentElement;
  const bodyComputed = window.getComputedStyle(body);
  const htmlComputed = window.getComputedStyle(html);
  
  return {
    bodyOverflow: body.style.overflow || '(not set)',
    bodyOverflowY: body.style.overflowY || '(not set)',
    bodyPosition: body.style.position || '(not set)',
    bodyTop: body.style.top || '(not set)',
    bodyPaddingRight: body.style.paddingRight || '(not set)',
    bodyPointerEvents: body.style.pointerEvents || '(not set)',
    bodyScrollLocked: body.getAttribute('data-scroll-locked'),
    bodyOverflowHidden: body.classList.contains('overflow-hidden'),
    
    bodyComputedOverflow: bodyComputed.overflow,
    bodyComputedOverflowY: bodyComputed.overflowY,
    bodyComputedPosition: bodyComputed.position,
    
    htmlOverflow: html.style.overflow || '(not set)',
    htmlScrollLocked: html.getAttribute('data-scroll-locked'),
    htmlOverflowHidden: html.classList.contains('overflow-hidden'),
    
    htmlComputedOverflow: htmlComputed.overflow,
    htmlComputedOverflowY: htmlComputed.overflowY,
    
    innerHeight: window.innerHeight,
    scrollHeight: html.scrollHeight,
    scrollY: window.scrollY,
    
    isOverlayOpen: isAnyOverlayOpen(),
    dialogCount: document.querySelectorAll('[role="dialog"][data-state="open"]').length,
    radixOverlayCount: document.querySelectorAll('[data-radix-dialog-overlay]').length,
    vaulDrawerCount: document.querySelectorAll('[data-vaul-drawer]').length,
  };
}

function isLocked(state: ScrollState): boolean {
  return (
    state.bodyOverflow === 'hidden' ||
    state.bodyOverflowY === 'hidden' ||
    state.bodyPosition === 'fixed' ||
    state.bodyPointerEvents === 'none' ||
    state.htmlOverflow === 'hidden' ||
    state.bodyScrollLocked !== null ||
    state.htmlScrollLocked !== null ||
    state.bodyOverflowHidden ||
    state.htmlOverflowHidden ||
    state.bodyComputedOverflow === 'hidden' ||
    state.bodyComputedOverflowY === 'hidden' ||
    state.htmlComputedOverflow === 'hidden' ||
    state.htmlComputedOverflowY === 'hidden'
  );
}

export function ScrollLockDebugger() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ScrollState | null>(null);
  const [wheelCount, setWheelCount] = useState(0);
  const [lastWheelDelta, setLastWheelDelta] = useState<{ x: number; y: number } | null>(null);
  const wheelTimeoutRef = useRef<number | null>(null);
  
  const enabled = searchParams.get('debugScroll') === '1';
  
  useEffect(() => {
    if (!enabled) return;
    
    // Initial state
    setState(getScrollState());
    
    // Poll every 250ms
    const interval = setInterval(() => {
      setState(getScrollState());
    }, 250);
    
    // Track wheel events
    const handleWheel = (e: WheelEvent) => {
      setWheelCount(c => c + 1);
      setLastWheelDelta({ x: e.deltaX, y: e.deltaY });
      
      // Clear after 2 seconds of no wheel activity
      if (wheelTimeoutRef.current) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = window.setTimeout(() => {
        setLastWheelDelta(null);
      }, 2000);
    };
    
    // Add listener on document to capture all wheel events
    document.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('wheel', handleWheel);
      if (wheelTimeoutRef.current) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [enabled]);
  
  if (!enabled || !state) return null;
  
  const locked = isLocked(state);
  const canScroll = state.scrollHeight > state.innerHeight;
  
  const handleForceUnlock = () => {
    clearDocumentScrollLocks();
    setState(getScrollState());
  };
  
  const handleLogSnapshot = () => {
    console.log('=== SCROLL LOCK DEBUG SNAPSHOT ===');
    console.log(JSON.stringify(state, null, 2));
    console.log('Locked:', locked);
    console.log('Can scroll (height):', canScroll);
    console.log('Wheel events received:', wheelCount);
    console.log('==================================');
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 8,
        zIndex: 99999,
        background: locked ? 'rgba(220, 38, 38, 0.95)' : 'rgba(22, 163, 74, 0.95)',
        color: 'white',
        padding: 12,
        borderRadius: 8,
        fontSize: 10,
        fontFamily: 'monospace',
        maxWidth: 340,
        maxHeight: '60vh',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>
        Scroll Debug {locked ? '🔒 LOCKED' : '✅ OK'}
      </div>
      
      <div style={{ marginBottom: 6, padding: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
        <strong>🖱️ Wheel Events:</strong>
        <div>count: {wheelCount}</div>
        <div>last delta: {lastWheelDelta ? `(${lastWheelDelta.x.toFixed(0)}, ${lastWheelDelta.y.toFixed(0)})` : '(none yet)'}</div>
      </div>
      
      <div style={{ marginBottom: 6 }}>
        <strong>Body (inline):</strong>
        <div>overflow: {state.bodyOverflow}</div>
        <div>overflowY: {state.bodyOverflowY}</div>
        <div>position: {state.bodyPosition}</div>
        <div>pointerEvents: {state.bodyPointerEvents}</div>
        <div>data-scroll-locked: {state.bodyScrollLocked ?? '(none)'}</div>
      </div>
      
      <div style={{ marginBottom: 6, background: 'rgba(0,0,0,0.15)', padding: 4, borderRadius: 2 }}>
        <strong>Body (computed):</strong>
        <div>overflow: {state.bodyComputedOverflow}</div>
        <div>overflowY: {state.bodyComputedOverflowY}</div>
        <div>position: {state.bodyComputedPosition}</div>
      </div>
      
      <div style={{ marginBottom: 6 }}>
        <strong>HTML (inline):</strong>
        <div>overflow: {state.htmlOverflow}</div>
        <div>data-scroll-locked: {state.htmlScrollLocked ?? '(none)'}</div>
      </div>
      
      <div style={{ marginBottom: 6, background: 'rgba(0,0,0,0.15)', padding: 4, borderRadius: 2 }}>
        <strong>HTML (computed):</strong>
        <div>overflow: {state.htmlComputedOverflow}</div>
        <div>overflowY: {state.htmlComputedOverflowY}</div>
      </div>
      
      <div style={{ marginBottom: 6 }}>
        <strong>Scroll:</strong>
        <div>innerHeight: {state.innerHeight}px</div>
        <div>scrollHeight: {state.scrollHeight}px</div>
        <div>scrollY: {state.scrollY}px</div>
        <div>canScroll: {canScroll ? 'YES' : 'NO'}</div>
      </div>
      
      <div style={{ marginBottom: 8 }}>
        <strong>Overlays:</strong>
        <div>isAnyOverlayOpen: {state.isOverlayOpen ? 'YES' : 'no'}</div>
        <div>dialogs: {state.dialogCount} | radix: {state.radixOverlayCount} | vaul: {state.vaulDrawerCount}</div>
      </div>
      
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleForceUnlock}
          style={{
            background: 'white',
            color: 'black',
            border: 'none',
            padding: '6px 10px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 'bold',
          }}
        >
          Force Unlock
        </button>
        <button
          onClick={handleLogSnapshot}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid white',
            padding: '6px 10px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Log Snapshot
        </button>
      </div>
    </div>
  );
}
