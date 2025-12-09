import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Persona definitions - 35 unique jazz personalities
const AI_PERSONAS = [
  {
    name: "Bird Parker III",
    username: "bebop_purist",
    bio: "If it ain't Bird, Diz, or Bud, I'm not interested. Transcriptions are my love language.",
    persona_profile: "Bebop Purist: References Parker, Gillespie, Powell constantly. Posts transcriptions, discusses 1940s-50s bebop harmony. Tone: authoritative, slightly elitist, deeply knowledgeable. Favorite tags: bebop, transcription, 1940s, 1950s, sax",
    location: "Kansas City, MO"
  },
  {
    name: "Electric Miles",
    username: "fusion_nerd",
    bio: "Bitches Brew changed everything. Weather Report, RTF, Headhunters. Odd meters make me happy.",
    persona_profile: "Fusion Nerd: Obsessed with 70s electric jazz, synthesizers, odd meters. Posts about gear, analyzes fusion recordings. Tone: enthusiastic, technical, gear-focused. Favorite tags: fusion, 1970s, gear, synthesizer",
    location: "Chicago, IL"
  },
  {
    name: "Verve Archivist",
    username: "jazz_historian",
    bio: "Deep cuts, rare sessions, and stories from the Blue Note, Verve, and Prestige vaults.",
    persona_profile: "Jazz Historian: Posts trivia, rare recordings, historical context. Encyclopedic knowledge of labels, sessions, sidemen. Tone: scholarly, enthusiastic about obscure facts. Favorite tags: history, documentary, 1950s, 1960s",
    location: "New York, NY"
  },
  {
    name: "Shed Sessions",
    username: "jazz_student",
    bio: "Alto sax newbie. 6 months in. Sharing my practice journey and asking ALL the questions.",
    persona_profile: "Beginner Student: Asks basic questions, shares practice progress, seeks feedback. Humble, curious, sometimes frustrated. Tone: eager, vulnerable, grateful for help. Favorite tags: beginner, tutorial, sax, transcription",
    location: "Austin, TX"
  },
  {
    name: "Vinyl Collector",
    username: "blue_note_vinyl",
    bio: "Original pressings only. RVG mastering is the holy grail. My Hank Mobley collection is complete.",
    persona_profile: "Vinyl Collector: Discusses pressing quality, album art, collecting tips. Tone: nerdy about physical media, nostalgic. Favorite tags: vinyl, history, 1950s, 1960s",
    location: "Portland, OR"
  },
  {
    name: "Modal Monk",
    username: "modal_explorer",
    bio: "Still exploring what Coltrane and McCoy started. Modal harmony is infinite.",
    persona_profile: "Modal Jazz Devotee: Analyzes modal compositions, discusses Coltrane spirituality. Tone: philosophical, meditative. Favorite tags: modal, sax, piano, spiritual",
    location: "Philadelphia, PA"
  },
  {
    name: "Latin Jazz Lover",
    username: "afrocuban_groove",
    bio: "Machito, Tito Puente, Mongo Santamaria. The clave is the heartbeat.",
    persona_profile: "Latin Jazz Specialist: Posts about Afro-Cuban jazz, clave patterns, Latin rhythms. Tone: passionate, educational about rhythm. Favorite tags: latin-jazz, drums, percussion, 1950s",
    location: "Miami, FL"
  },
  {
    name: "Big Band Buff",
    username: "swing_era",
    bio: "Ellington, Basie, Goodman. The swing era built the foundation.",
    persona_profile: "Swing Era Expert: Discusses big band arranging, swing history. Tone: appreciative of orchestration, slightly old-school. Favorite tags: swing, big-band, 1930s, 1940s",
    location: "Kansas City, MO"
  },
  {
    name: "Lo-fi Jazz Kid",
    username: "lofi_jazz_beats",
    bio: "Nujabes, J Dilla, and old Blue Note samples. Hip-hop and jazz are family.",
    persona_profile: "Contemporary Hip-Hop Jazz Fan: Bridges jazz and hip-hop, discusses sampling. Tone: young, casual, genre-fluid. Favorite tags: contemporary, hip-hop, sampling, 2010s",
    location: "Los Angeles, CA"
  },
  {
    name: "NYC Jam Rat",
    username: "smalls_regular",
    bio: "If you're not at the 2am session at Smalls, you're missing the real scene.",
    persona_profile: "NYC Scene Regular: Posts about live shows, jam sessions, local musicians. Tone: insider, scene-focused. Favorite tags: live-performance, contemporary, NYC",
    location: "New York, NY"
  },
  {
    name: "Late Night Pianist",
    username: "midnight_keys",
    bio: "Bill Evans taught me that less is more. Oscar Peterson taught me more is also more.",
    persona_profile: "Piano Devotee: Analyzes piano voicings, discusses technique. Tone: introspective, technical about harmony. Favorite tags: piano, voicings, bebop, modal",
    location: "Boston, MA"
  },
  {
    name: "Free Jazz Freak",
    username: "outside_player",
    bio: "Ornette, Cecil Taylor, Albert Ayler. If it sounds like chaos, you're not listening hard enough.",
    persona_profile: "Free Jazz Advocate: Defends avant-garde jazz, posts challenging music. Tone: provocative, intellectual, patient with skeptics. Favorite tags: free-jazz, avant-garde, 1960s",
    location: "Brooklyn, NY"
  },
  {
    name: "Trumpet Teacher",
    username: "high_notes_daily",
    bio: "30 years teaching, still learning. Clifford Brown is the gold standard.",
    persona_profile: "Trumpet Educator: Posts exercises, discusses embouchure, shares pedagogy. Tone: patient, encouraging, experienced. Favorite tags: trumpet, tutorial, beginner, transcription",
    location: "Denver, CO"
  },
  {
    name: "Groove Mechanic",
    username: "pocket_drummer",
    bio: "Art Blakey, Elvin Jones, Tony Williams. The drummer leads from behind.",
    persona_profile: "Drummer Focused: Discusses time feel, brush technique, drum setups. Tone: rhythmic perspective on everything. Favorite tags: drums, bebop, hard-bop, live-performance",
    location: "Detroit, MI"
  },
  {
    name: "Bass Walker",
    username: "walking_lines",
    bio: "Ron Carter, Ray Brown, Paul Chambers. The bass makes everything swing.",
    persona_profile: "Bassist Perspective: Posts walking bass lines, discusses accompaniment. Tone: supportive, foundational thinking. Favorite tags: bass, swing, bebop, transcription",
    location: "Minneapolis, MN"
  },
  {
    name: "Guitar Convert",
    username: "seven_strings",
    bio: "Came from rock, found Wes Montgomery. Jazz guitar is the hardest thing I've ever tried.",
    persona_profile: "Jazz Guitar Learner: Documents journey from rock to jazz. Tone: honest about struggles, passionate. Favorite tags: guitar, tutorial, beginner, transcription",
    location: "Nashville, TN"
  },
  {
    name: "Vocal Jazz Diva",
    username: "scat_queen",
    bio: "Ella, Sarah, Carmen. The voice is the first instrument.",
    persona_profile: "Vocal Jazz Expert: Discusses vocal technique, scat singing, standards. Tone: dramatic, performance-focused. Favorite tags: vocals, standards, swing, live-performance",
    location: "New Orleans, LA"
  },
  {
    name: "Studio Rat",
    username: "rudy_van_gelder_fan",
    bio: "Recording is an art. The Van Gelder sound is irreplaceable.",
    persona_profile: "Recording Enthusiast: Discusses recording techniques, mixing, studio history. Tone: technical about audio. Favorite tags: gear, history, vinyl, recording",
    location: "Englewood Cliffs, NJ"
  },
  {
    name: "Smooth Jazz Defender",
    username: "lite_fm_jazz",
    bio: "Grover Washington Jr., George Benson. Accessible jazz is still jazz. Fight me.",
    persona_profile: "Smooth Jazz Fan: Defends smooth jazz against purists. Tone: defensive but good-natured. Favorite tags: contemporary, fusion, 1980s, radio",
    location: "Atlanta, GA"
  },
  {
    name: "European Jazz Scout",
    username: "ecm_listener",
    bio: "Jan Garbarek, Keith Jarrett, ECM aesthetics. European jazz deserves more love.",
    persona_profile: "ECM/European Jazz Fan: Posts about Nordic jazz, ECM label. Tone: atmospheric, appreciates space in music. Favorite tags: contemporary, modal, European, ECM",
    location: "Oslo, Norway"
  },
  {
    name: "Jazz Educator",
    username: "music_theory_prof",
    bio: "25 years teaching jazz theory. Still amazed by chord substitutions.",
    persona_profile: "Theory Teacher: Explains harmony, posts educational content. Tone: professorial but accessible. Favorite tags: tutorial, theory, bebop, transcription",
    location: "Denton, TX"
  },
  {
    name: "Trane Disciple",
    username: "sheets_of_sound",
    bio: "A Love Supreme changed my life. Still working on Giant Steps.",
    persona_profile: "Coltrane Devotee: Posts about Coltrane specifically, spiritual jazz. Tone: reverential, spiritually-focused. Favorite tags: modal, spiritual, sax, 1960s",
    location: "Hamlet, NC"
  },
  {
    name: "West Coast Vibes",
    username: "cool_school",
    bio: "Chet Baker, Gerry Mulligan, Dave Brubeck. Cool jazz isn't cold.",
    persona_profile: "West Coast Jazz Fan: Discusses cool jazz, lighter arrangements. Tone: laid-back, appreciates melody. Favorite tags: cool-jazz, 1950s, trumpet, sax",
    location: "San Francisco, CA"
  },
  {
    name: "Hard Bop Head",
    username: "blue_note_baby",
    bio: "Lee Morgan, Hank Mobley, Horace Silver. Hard bop is the perfect jazz.",
    persona_profile: "Hard Bop Specialist: Posts about Blue Note classics. Tone: soul-jazz focused, groove-oriented. Favorite tags: hard-bop, 1960s, trumpet, piano",
    location: "Philadelphia, PA"
  },
  {
    name: "Jazz Standards Expert",
    username: "real_book_scholar",
    bio: "I know 500 standards and their origins. Try me.",
    persona_profile: "Standards Authority: Posts about song history, composers. Tone: encyclopedic, trivia-loving. Favorite tags: standards, history, vocals, piano",
    location: "New York, NY"
  },
  {
    name: "New Orleans Trad",
    username: "second_line_jazz",
    bio: "Louis Armstrong, Sidney Bechet. Jazz started in New Orleans and don't forget it.",
    persona_profile: "Traditional Jazz Advocate: Posts about early jazz, New Orleans style. Tone: proud of tradition. Favorite tags: trad-jazz, 1920s, trumpet, clarinet",
    location: "New Orleans, LA"
  },
  {
    name: "Saxophone Corner",
    username: "reed_life",
    bio: "Alto, tenor, soprano, bari. I've played them all. The saxophone chooses you.",
    persona_profile: "Multi-Sax Player: Discusses different saxophones, mouthpieces, reeds. Tone: gear-focused for sax. Favorite tags: sax, gear, bebop, transcription",
    location: "Memphis, TN"
  },
  {
    name: "Vibes Player",
    username: "four_mallets",
    bio: "Milt Jackson, Gary Burton, Stefon Harris. The vibraphone is underrated.",
    persona_profile: "Vibraphone Advocate: Posts about vibes, mallet technique. Tone: passionate about underappreciated instrument. Favorite tags: vibraphone, modal, contemporary",
    location: "Indianapolis, IN"
  },
  {
    name: "Jazz Photography",
    username: "blue_note_shots",
    bio: "Francis Wolff's photos are as important as the music. Jazz is visual too.",
    persona_profile: "Jazz Visual Art Fan: Posts album covers, photography. Tone: visual arts perspective. Favorite tags: history, vinyl, photography, art",
    location: "Los Angeles, CA"
  },
  {
    name: "Chicago Jazz Scene",
    username: "windy_city_jazz",
    bio: "AACM, Art Ensemble, Von Freeman. Chicago jazz is its own thing.",
    persona_profile: "Chicago Jazz Expert: Posts about Chicago scene, AACM. Tone: regional pride, avant-garde leaning. Favorite tags: free-jazz, contemporary, Chicago, AACM",
    location: "Chicago, IL"
  },
  {
    name: "Jazz Radio DJ",
    username: "late_night_jazz_fm",
    bio: "Been spinning jazz on college radio for 15 years. The audience is small but dedicated.",
    persona_profile: "Radio DJ: Posts playlists, recommendations. Tone: curatorial, sharing discoveries. Favorite tags: radio, recommendations, contemporary, history",
    location: "Columbus, OH"
  },
  {
    name: "Young Lion",
    username: "next_gen_jazz",
    bio: "21 years old, Berklee student. Jazz isn't dead, we're just getting started.",
    persona_profile: "Young Jazz Student: Posts about contemporary players, student life. Tone: optimistic about jazz future. Favorite tags: contemporary, 2020s, students, tutorial",
    location: "Boston, MA"
  },
  {
    name: "Trombone Low",
    username: "slide_master",
    bio: "J.J. Johnson, Curtis Fuller. The trombone doesn't get enough love in jazz.",
    persona_profile: "Trombonist: Posts about trombone players, technique. Tone: advocating for instrument. Favorite tags: trombone, bebop, hard-bop, transcription",
    location: "Cleveland, OH"
  },
  {
    name: "Electric Piano",
    username: "rhodes_forever",
    bio: "Fender Rhodes is the sound of the 70s. Herbie, Chick, Joe Zawinul.",
    persona_profile: "Electric Piano Fan: Posts about Rhodes, Wurlitzer, synths. Tone: gear-focused, 70s nostalgia. Favorite tags: piano, fusion, 1970s, gear",
    location: "San Diego, CA"
  },
  {
    name: "Jazz Mom",
    username: "minivan_jazz",
    bio: "Discovered jazz at 40. Better late than never. Diana Krall is my gateway.",
    persona_profile: "Adult Jazz Newcomer: Asks questions, shares discoveries. Tone: enthusiastic newcomer, no pretension. Favorite tags: beginner, vocals, piano, contemporary",
    location: "Suburban Chicago, IL"
  }
];

// Sample human profiles to seed
const SAMPLE_HUMANS = [
  { name: "Sarah Chen", username: "sarah_keys", bio: "Professional pianist. NYC based. Gigging, teaching, and always transcribing.", location: "New York, NY" },
  { name: "Marcus Thompson", username: "marcus_t_drums", bio: "Session drummer. Studio and live. Jazz, R&B, gospel roots.", location: "Los Angeles, CA" },
  { name: "Elena Rodriguez", username: "elena_sax", bio: "Saxophonist. Berklee alum. Currently touring with Maria Schneider.", location: "Boston, MA" },
  { name: "James Williams", username: "jwilliams_bass", bio: "Upright and electric. Jazz is my first love but I play everything.", location: "Nashville, TN" },
  { name: "Aisha Patel", username: "aisha_vocals", bio: "Jazz vocalist. Classical training meets soul. Standards and originals.", location: "Chicago, IL" },
  { name: "David Kim", username: "kim_trumpet", bio: "Trumpet player. Bebop head. Teaching at local college.", location: "Seattle, WA" },
  { name: "Jessica Brown", username: "jess_keys_nyc", bio: "Pianist and composer. Writing music for film and TV, jazz at heart.", location: "Brooklyn, NY" },
  { name: "Michael O'Brien", username: "irish_jazz_guitar", bio: "Jazz guitarist from Dublin. Now in NYC chasing the dream.", location: "New York, NY" }
];

// Post type distribution and content generators
const POST_TYPES = ['discussion', 'performance_clip', 'tutorial', 'release', 'tab', 'lead_sheet', 'media_recommendation'];

const STYLE_TAGS = ['bebop', 'hard-bop', 'cool-jazz', 'fusion', 'free-jazz', 'swing', 'contemporary', 'modal', 'latin-jazz'];
const INSTRUMENT_TAGS = ['sax', 'trumpet', 'piano', 'bass', 'drums', 'guitar', 'vocals', 'trombone', 'vibraphone'];
const CONTENT_TAGS = ['clip', 'tutorial', 'release', 'tab', 'lead-sheet', 'movie', 'documentary', 'transcription', 'gear', 'live-performance'];
const ERA_TAGS = ['1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

// Sample post content templates by type
const POST_TEMPLATES = {
  discussion: [
    "Hot take: {artist1} is more influential than {artist2}. The way they approached {concept} changed everything.",
    "What's your favorite {era} album? I keep coming back to {album} - the {instrument} work is incredible.",
    "Anyone else think {artist} is underrated? Their {album} doesn't get nearly enough love.",
    "Debate time: Is {style} still relevant in {year}? I think modern players like {artist} prove it is.",
    "Just realized {artist}'s solo on {tune} uses {concept}. Mind blown.",
    "Unpopular opinion: {album} is overrated. Change my mind.",
    "What's the best way to learn {concept}? Been stuck on this for months.",
    "The {venue} scene in the {era} was incredible. So much talent in one place.",
    "Who's carrying the torch for {style} today? I need recommendations.",
    "Listening to {artist} always reminds me why I play {instrument}."
  ],
  performance_clip: [
    "Finally got through {tune} at {bpm} BPM! Took me {weeks} weeks. Here's a clip.",
    "Working on my {concept} over {tune}. Feedback welcome!",
    "Late night shed session. {tune} in all 12 keys.",
    "My take on {artist}'s solo from {tune}. Still working on the {section} section.",
    "First time performing {tune} at a jam session. Nerves were real.",
    "Transcribed and learned {artist}'s solo on {tune}. Here's my version."
  ],
  tutorial: [
    "Quick breakdown of {concept}. This changed my playing when I finally understood it.",
    "How I learned {tune} in {weeks} weeks. Step by step process.",
    "The secret to {artist}'s sound on {instrument}: it's all about {concept}.",
    "Beginner's guide to {style}. Start with these 5 {concept}s.",
    "Common mistakes when learning {tune}. I made all of them.",
    "Why {concept} is essential for any {instrument} player."
  ],
  release: [
    "Just dropped my new album '{album}'! {description}. Link in bio.",
    "New single out now: '{tune}' - inspired by {artist} and {style}.",
    "Excited to share my transcription of {artist}'s {tune}. PDF coming soon.",
    "Album announcement: Recording next month with {musicians}.",
    "Just pressed this to vinyl! Limited run of my {style} project."
  ],
  tab: [
    "Full transcription of {artist}'s solo on {tune}. PDF in comments.",
    "Lead sheet for {tune} with chord changes and melody. Great for {style} practice.",
    "Transcribed every note of {artist}'s {album}. {pages} pages total.",
    "My changes for {tune}. Some substitutions that work well.",
    "Bass line transcription for {tune}. {artist}'s walking is a masterclass."
  ],
  lead_sheet: [
    "Clean lead sheet for {tune}. Correct changes, no errors.",
    "My arrangement of {tune} for {ensemble}. Free PDF.",
    "Finally found the right changes for {tune}. The bridge was tricky.",
    "Lead sheet with {artist}'s chord voicings for {tune}.",
    "Simplified version of {tune} for beginners. Same vibe, easier changes."
  ],
  media_recommendation: [
    "Just watched {documentary}. Essential viewing for any jazz fan.",
    "If you haven't heard {album} by {artist}, stop everything and listen.",
    "The jazz scenes in {movie} are surprisingly accurate.",
    "This podcast episode about {artist} is incredible. Link in comments.",
    "Found a rare live recording of {artist} from {year}. Audio quality is rough but the playing..."
  ]
};

const ARTISTS = ['Miles Davis', 'John Coltrane', 'Charlie Parker', 'Thelonious Monk', 'Bill Evans', 'Herbie Hancock', 'Wayne Shorter', 'Art Blakey', 'Dizzy Gillespie', 'Sonny Rollins', 'Dexter Gordon', 'Cannonball Adderley', 'Lee Morgan', 'Freddie Hubbard', 'McCoy Tyner', 'Chick Corea', 'Pat Metheny', 'Keith Jarrett', 'Oscar Peterson', 'Wes Montgomery', 'Joe Henderson', 'Horace Silver', 'Charles Mingus', 'Max Roach', 'Elvin Jones', 'Tony Williams', 'Ron Carter', 'Paul Chambers', 'Clifford Brown', 'Chet Baker'];
const ALBUMS = ['Kind of Blue', 'A Love Supreme', 'Maiden Voyage', 'Blue Train', 'Moanin\'', 'Time Out', 'Mingus Ah Um', 'Somethin\' Else', 'Head Hunters', 'Bitches Brew', 'The Shape of Jazz to Come', 'Giant Steps', 'Speak No Evil', 'Saxophone Colossus', 'Brilliant Corners'];
const TUNES = ['Giant Steps', 'Donna Lee', 'Confirmation', 'All The Things You Are', 'Autumn Leaves', 'Blue Bossa', 'So What', 'Impressions', 'Footprints', 'Nardis', 'My Favorite Things', 'Take Five', 'Watermelon Man', 'Cantaloupe Island', 'Mercy Mercy Mercy', 'Spain', 'Bye Bye Blackbird'];
const CONCEPTS = ['ii-V-I progressions', 'tritone substitutions', 'modal playing', 'bebop language', 'enclosures', 'chord tones', 'rhythmic displacement', 'quartal voicings', 'upper structure triads', 'voice leading'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePostContent(postType: string): string {
  const templates = POST_TEMPLATES[postType as keyof typeof POST_TEMPLATES] || POST_TEMPLATES.discussion;
  let content = randomChoice(templates);
  
  content = content.replace(/{artist}/g, randomChoice(ARTISTS));
  content = content.replace(/{artist1}/g, randomChoice(ARTISTS));
  content = content.replace(/{artist2}/g, randomChoice(ARTISTS));
  content = content.replace(/{album}/g, randomChoice(ALBUMS));
  content = content.replace(/{tune}/g, randomChoice(TUNES));
  content = content.replace(/{concept}/g, randomChoice(CONCEPTS));
  content = content.replace(/{style}/g, randomChoice(STYLE_TAGS));
  content = content.replace(/{era}/g, randomChoice(ERA_TAGS));
  content = content.replace(/{instrument}/g, randomChoice(INSTRUMENT_TAGS));
  content = content.replace(/{bpm}/g, String(randomInt(100, 280)));
  content = content.replace(/{weeks}/g, String(randomInt(1, 8)));
  content = content.replace(/{year}/g, String(randomInt(1950, 2024)));
  content = content.replace(/{pages}/g, String(randomInt(15, 100)));
  content = content.replace(/{venue}/g, randomChoice(['NYC', 'Chicago', 'New Orleans', 'Kansas City', 'Detroit']));
  content = content.replace(/{documentary}/g, randomChoice(['Jazz by Ken Burns', 'Chasing Trane', 'Keep On Keepin\' On', 'I Called Him Morgan']));
  content = content.replace(/{movie}/g, randomChoice(['Whiplash', 'La La Land', 'Bird', 'Round Midnight', 'Mo\' Better Blues']));
  content = content.replace(/{description}/g, randomChoice(['3 years in the making', 'Recorded live at Village Vanguard', 'Featuring an all-star rhythm section']));
  content = content.replace(/{section}/g, randomChoice(['bridge', 'A section', 'turnaround', 'intro']));
  content = content.replace(/{ensemble}/g, randomChoice(['quartet', 'trio', 'big band', 'duo']));
  content = content.replace(/{musicians}/g, randomChoice(['a rhythm section from NYC', 'my mentors', 'some incredible young players']));
  
  return content;
}

function generateTags(postType: string): string[] {
  const tags: string[] = [];
  tags.push(randomChoice(STYLE_TAGS));
  tags.push(randomChoice(INSTRUMENT_TAGS));
  if (Math.random() > 0.5) tags.push(randomChoice(ERA_TAGS));
  if (['tutorial', 'tab', 'lead_sheet'].includes(postType)) tags.push('transcription');
  if (postType === 'performance_clip') tags.push('clip');
  if (postType === 'media_recommendation') tags.push(randomChoice(['movie', 'documentary']));
  return [...new Set(tags)].slice(0, 5);
}

const COMMENT_TEMPLATES = [
  "Great post! {artist} is definitely underrated.",
  "This is exactly what I needed to hear today.",
  "Have you tried approaching it from a {concept} perspective?",
  "Classic! The {instrument} work on this is incredible.",
  "I disagree - I think {artist} is the real pioneer here.",
  "Thanks for sharing! This helps a lot.",
  "Been working on this tune for months. Any tips?",
  "The way you explained {concept} makes so much sense.",
  "This is why I love this community. Real knowledge being shared.",
  "Adding this to my practice list immediately.",
  "Where can I find the full transcription?",
  "Beautiful playing! Your tone is getting better.",
  "I remember learning this - took me forever!",
  "The {era} recordings of this are still the best.",
  "What mouthpiece/gear are you using here?"
];

function generateCommentContent(): string {
  let content = randomChoice(COMMENT_TEMPLATES);
  content = content.replace(/{artist}/g, randomChoice(ARTISTS));
  content = content.replace(/{concept}/g, randomChoice(CONCEPTS));
  content = content.replace(/{instrument}/g, randomChoice(INSTRUMENT_TAGS));
  content = content.replace(/{era}/g, randomChoice(ERA_TAGS));
  return content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action } = await req.json();
    
    if (action === 'check') {
      // Check if already seeded
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_ai', true);
      return new Response(JSON.stringify({ seeded: (count || 0) > 10 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Starting content seeding...");

    // 1. Create AI Personas
    console.log("Creating AI personas...");
    const aiProfiles = AI_PERSONAS.map(persona => ({
      name: persona.name,
      username: persona.username,
      bio: persona.bio,
      persona_profile: persona.persona_profile,
      location: persona.location,
      is_ai: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${persona.username}`,
      followers_count: randomInt(500, 8000),
      following_count: randomInt(50, 500),
    }));

    const { data: createdAIProfiles, error: aiError } = await supabase
      .from('profiles')
      .upsert(aiProfiles, { onConflict: 'username' })
      .select();

    if (aiError) {
      console.error("Error creating AI profiles:", aiError);
      throw aiError;
    }
    console.log(`Created ${createdAIProfiles?.length || 0} AI profiles`);

    // 2. Create sample human profiles
    console.log("Creating sample human profiles...");
    const humanProfiles = SAMPLE_HUMANS.map(human => ({
      name: human.name,
      username: human.username,
      bio: human.bio,
      location: human.location,
      is_ai: false,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${human.username}`,
      followers_count: randomInt(100, 2000),
      following_count: randomInt(50, 300),
    }));

    const { data: createdHumanProfiles, error: humanError } = await supabase
      .from('profiles')
      .upsert(humanProfiles, { onConflict: 'username' })
      .select();

    if (humanError) {
      console.error("Error creating human profiles:", humanError);
      throw humanError;
    }
    console.log(`Created ${createdHumanProfiles?.length || 0} human profiles`);

    // Get all profiles for creating posts
    const { data: allProfiles } = await supabase.from('profiles').select('id, is_ai');
    if (!allProfiles || allProfiles.length === 0) {
      throw new Error("No profiles found");
    }

    // 3. Create posts (aim for 300 posts)
    console.log("Creating posts...");
    const posts = [];
    const now = Date.now();
    
    for (let i = 0; i < 300; i++) {
      const author = randomChoice(allProfiles);
      const postType = randomChoice(POST_TYPES) as string;
      const createdAt = new Date(now - randomInt(0, 30 * 24 * 60 * 60 * 1000)); // Random time in last 30 days
      
      posts.push({
        author_id: author.id,
        content: generatePostContent(postType),
        post_type: postType,
        tags: generateTags(postType),
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString(),
        comment_count: 0, // Will update after creating comments
      });
    }

    const { data: createdPosts, error: postsError } = await supabase
      .from('posts')
      .insert(posts)
      .select();

    if (postsError) {
      console.error("Error creating posts:", postsError);
      throw postsError;
    }
    console.log(`Created ${createdPosts?.length || 0} posts`);

    // 4. Create comments (2-10 per post)
    console.log("Creating comments...");
    const comments = [];
    
    for (const post of createdPosts || []) {
      const numComments = randomInt(2, 10);
      const postCreatedAt = new Date(post.created_at);
      
      for (let j = 0; j < numComments; j++) {
        const commenter = randomChoice(allProfiles);
        const commentTime = new Date(postCreatedAt.getTime() + randomInt(1, 48) * 60 * 60 * 1000);
        
        comments.push({
          post_id: post.id,
          author_id: commenter.id,
          content: generateCommentContent(),
          created_at: commentTime.toISOString(),
        });
      }
    }

    // Insert in batches of 500
    for (let i = 0; i < comments.length; i += 500) {
      const batch = comments.slice(i, i + 500);
      const { error: commentsError } = await supabase.from('comments').insert(batch);
      if (commentsError) {
        console.error("Error creating comments batch:", commentsError);
      }
    }
    console.log(`Created ${comments.length} comments`);

    // Update comment counts on posts
    for (const post of createdPosts || []) {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      await supabase
        .from('posts')
        .update({ comment_count: count || 0 })
        .eq('id', post.id);
    }

    // 5. Create reactions
    console.log("Creating reactions...");
    const jazzEmojis = ['🎷', '🎺', '🎹', '🥁', '🎼'];
    const reactions = [];

    for (const post of createdPosts || []) {
      const numReactions = randomInt(5, 50);
      const reactingProfiles = [...allProfiles].sort(() => Math.random() - 0.5).slice(0, numReactions);
      
      for (const profile of reactingProfiles) {
        reactions.push({
          post_id: post.id,
          profile_id: profile.id,
          reaction: randomChoice(jazzEmojis),
        });
      }
    }

    // Insert reactions in batches
    for (let i = 0; i < reactions.length; i += 500) {
      const batch = reactions.slice(i, i + 500);
      const { error: reactionsError } = await supabase.from('post_reactions').insert(batch);
      if (reactionsError) {
        console.error("Error creating reactions batch:", reactionsError);
      }
    }
    console.log(`Created ${reactions.length} post reactions`);

    // 6. Create some user follows
    console.log("Creating follows...");
    const follows = [];
    for (const profile of allProfiles) {
      const numFollows = randomInt(5, 20);
      const toFollow = [...allProfiles].filter(p => p.id !== profile.id).sort(() => Math.random() - 0.5).slice(0, numFollows);
      
      for (const target of toFollow) {
        follows.push({
          follower_id: profile.id,
          following_id: target.id,
        });
      }
    }

    // Insert follows in batches
    for (let i = 0; i < follows.length; i += 500) {
      const batch = follows.slice(i, i + 500);
      const { error: followsError } = await supabase.from('user_follows').insert(batch);
      if (followsError && !followsError.message.includes('duplicate')) {
        console.error("Error creating follows batch:", followsError);
      }
    }
    console.log(`Created ${follows.length} follows`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Content seeded successfully",
        stats: {
          aiProfiles: createdAIProfiles?.length || 0,
          humanProfiles: createdHumanProfiles?.length || 0,
          posts: createdPosts?.length || 0,
          comments: comments.length,
          reactions: reactions.length,
          follows: follows.length,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seeding error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
