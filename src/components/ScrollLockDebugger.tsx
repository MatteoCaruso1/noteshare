import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clearDocumentScrollLocks, isAnyOverlayOpen } from '@/lib/scrollLock';

interface ScrollState {
  // Body styles
  bodyOverflow: string;
  bodyOverflowY: string;
  bodyPosition: string;
  bodyTop: string;
  bodyPaddingRight: string;
  bodyPointerEvents: string;
  bodyScrollLocked: string | null;
  bodyOverflowHidden: boolean;
  
  // Html styles
  htmlOverflow: string;
  htmlScrollLocked: string | null;
  htmlOverflowHidden: boolean;
  
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
  
  return {
    bodyOverflow: body.style.overflow || '(not set)',
    bodyOverflowY: body.style.overflowY || '(not set)',
    bodyPosition: body.style.position || '(not set)',
    bodyTop: body.style.top || '(not set)',
    bodyPaddingRight: body.style.paddingRight || '(not set)',
    bodyPointerEvents: body.style.pointerEvents || '(not set)',
    bodyScrollLocked: body.getAttribute('data-scroll-locked'),
    bodyOverflowHidden: body.classList.contains('overflow-hidden'),
    
    htmlOverflow: html.style.overflow || '(not set)',
    htmlScrollLocked: html.getAttribute('data-scroll-locked'),
    htmlOverflowHidden: html.classList.contains('overflow-hidden'),
    
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
    state.htmlOverflowHidden
  );
}

export function ScrollLockDebugger() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ScrollState | null>(null);
  
  const enabled = searchParams.get('debugScroll') === '1';
  
  useEffect(() => {
    if (!enabled) return;
    
    // Initial state
    setState(getScrollState());
    
    // Poll every 250ms
    const interval = setInterval(() => {
      setState(getScrollState());
    }, 250);
    
    return () => clearInterval(interval);
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
        fontSize: 11,
        fontFamily: 'monospace',
        maxWidth: 320,
        maxHeight: '50vh',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>
        Scroll Debug {locked ? '🔒 LOCKED' : '✅ OK'}
      </div>
      
      <div style={{ marginBottom: 8 }}>
        <strong>Body:</strong>
        <div>overflow: {state.bodyOverflow}</div>
        <div>overflowY: {state.bodyOverflowY}</div>
        <div>position: {state.bodyPosition}</div>
        <div>top: {state.bodyTop}</div>
        <div>paddingRight: {state.bodyPaddingRight}</div>
        <div>pointerEvents: {state.bodyPointerEvents}</div>
        <div>data-scroll-locked: {state.bodyScrollLocked ?? '(none)'}</div>
        <div>class overflow-hidden: {state.bodyOverflowHidden ? 'YES' : 'no'}</div>
      </div>
      
      <div style={{ marginBottom: 8 }}>
        <strong>HTML:</strong>
        <div>overflow: {state.htmlOverflow}</div>
        <div>data-scroll-locked: {state.htmlScrollLocked ?? '(none)'}</div>
        <div>class overflow-hidden: {state.htmlOverflowHidden ? 'YES' : 'no'}</div>
      </div>
      
      <div style={{ marginBottom: 8 }}>
        <strong>Scroll:</strong>
        <div>innerHeight: {state.innerHeight}px</div>
        <div>scrollHeight: {state.scrollHeight}px</div>
        <div>scrollY: {state.scrollY}px</div>
        <div>canScroll: {canScroll ? 'YES' : 'NO'}</div>
      </div>
      
      <div style={{ marginBottom: 8 }}>
        <strong>Overlays:</strong>
        <div>isAnyOverlayOpen: {state.isOverlayOpen ? 'YES' : 'no'}</div>
        <div>dialogs[data-state=open]: {state.dialogCount}</div>
        <div>radix overlays: {state.radixOverlayCount}</div>
        <div>vaul drawers: {state.vaulDrawerCount}</div>
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
