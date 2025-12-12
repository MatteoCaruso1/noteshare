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

// Sample post content templates by type - aim for 150-240 characters each
const POST_TEMPLATES = {
  discussion: [
    "Hot take: {artist1} is more influential than {artist2}. The way they approached {concept} completely changed how we think about improvisation. Would love to hear other perspectives on this.",
    "What's your favorite {era} album? I keep coming back to {album} - the {instrument} work is incredible, and the way the rhythm section locks in on every track is absolutely masterful.",
    "Anyone else think {artist} is criminally underrated? Their work on {album} doesn't get nearly enough love. That opening track alone is worth the price of admission.",
    "Debate time: Is {style} still relevant in {year}? I think modern players like {artist} are proving it absolutely is, but with fresh ideas that push the boundaries forward.",
    "Just realized {artist}'s solo on {tune} uses {concept} in a way I'd never noticed before. After 10 years of listening, still finding new layers in this music. Mind completely blown.",
    "Unpopular opinion: {album} is overrated. Yes, it's historically important, but the production hasn't aged well and there are better recordings from that same era. Change my mind.",
    "What's the best way to learn {concept}? Been stuck on this for months and feeling frustrated. Would love to hear how others worked through this challenge in their own practice.",
    "The {venue} scene in the {era} was incredible. So much talent concentrated in one place, and the cross-pollination between different groups created something truly magical.",
    "Who's carrying the torch for {style} today? I need recommendations for contemporary artists who are keeping this tradition alive while adding their own voice to it.",
    "Listening to {artist} always reminds me why I started playing {instrument} in the first place. There's something about their phrasing that speaks directly to the soul.",
    "Been transcribing {artist}'s solo on {tune} and discovered they use {concept} in the most unexpected places. This is why transcription is essential for any serious player.",
    "The interplay between {artist1} and {artist2} on {album} is peak jazz. They're having a real musical conversation, not just trading licks. This is what collective improvisation should sound like.",
    "Why don't more people talk about {artist}'s {era} recordings? Before they became famous for {album}, they were doing incredibly experimental things that predicted fusion by a decade.",
    "Just finished reading a biography of {artist} and learned that {tune} was recorded in a single take at 3am. The spontaneity you hear isn't an accident, it's the magic of jazz.",
    "The way {artist} navigates the changes on {tune} should be required study for every {instrument} player. Not just the notes, but the rhythmic conception and dynamics."
  ],
  performance_clip: [
    "Finally got through {tune} at {bpm} BPM after {weeks} weeks of dedicated practice! The bridge used to kill me but focusing on {concept} really unlocked it. Here's a clip, feedback welcome!",
    "Working on incorporating more {concept} into my playing over {tune}. It's a slow process but starting to feel more natural. Would love any suggestions or critiques from the community!",
    "Late night practice session, running {tune} through all 12 keys. My weaker keys still need work but the exercise is really helping my ears and muscle memory. Check the clip.",
    "My humble attempt at {artist}'s legendary solo from {tune}. Still working on nailing the {section} section but getting closer. The articulation is harder than it sounds!",
    "First time performing {tune} at a jam session last night. Nerves were very real but the rhythm section carried me through. Sharing the video because growth requires vulnerability.",
    "Transcribed {artist}'s solo on {tune} note for note, then spent a month internalizing it. Here's my version - not copying, but absorbing the language. That's how you learn this music.",
    "Experimenting with some {style} vocabulary over {tune}. Trying to blend the traditional changes with some more modern {concept} ideas. Let me know if it's working or if I'm overcomplicating it.",
    "Recording from our regular Thursday night session at the local club. We took {tune} at a burning tempo and somehow made it through alive. The energy when jazz is live is irreplaceable."
  ],
  tutorial: [
    "Quick breakdown of {concept} that completely transformed my playing when I finally internalized it. Took me years to figure this out, sharing so others don't have to struggle as long.",
    "How I learned {tune} in {weeks} weeks using a structured approach: slow practice, isolated sections, gradual tempo increases. Step by step process that actually works for complex tunes.",
    "The secret to {artist}'s distinctive sound on {instrument} isn't some mystery - it's all about their approach to {concept}. Here's a detailed breakdown with examples from their recordings.",
    "Beginner's guide to {style}: forget everything you think you know and start with these five fundamental {concept}s. Build from here and the rest will follow naturally.",
    "Common mistakes when learning {tune} - I made every single one of them and it set me back months. Sharing so you can avoid my painful learning curve and get to making music faster.",
    "Why mastering {concept} is absolutely essential for any serious {instrument} player. It's the foundation everything else builds on, and most people skip it to learn flashy licks instead.",
    "Breaking down the first 8 bars of {artist}'s solo on {tune}. Every note choice is intentional and teaches something about {concept}. This is how I approach transcription study.",
    "The practice routine that finally helped me internalize {concept} after years of struggling. It's not sexy or complicated, but consistency with these fundamentals changed everything."
  ],
  release: [
    "Just dropped my new album '{album}'! {description}. Every track features original compositions inspired by the {style} tradition but with a modern sensibility. Link in bio, would love your thoughts.",
    "New single out now: '{tune}' - a deep dive into what happens when you blend {artist}'s harmonic sensibility with {style} grooves. Took months to get the arrangement right. Streaming everywhere.",
    "Excited to share my complete transcription of {artist}'s {tune} solo. Every note, every articulation, every rhythmic nuance. PDF coming soon to help the community grow together.",
    "Album announcement: Heading into the studio next month to record with an incredible lineup of {venue} musicians. We've been working on these arrangements for a year. Can't wait to share.",
    "Just pressed a limited vinyl run of my {style} project! Analog warmth was essential for this sound. Only 200 copies made. Details in comments for anyone interested in a physical copy."
  ],
  tab: [
    "Full transcription of {artist}'s iconic solo on {tune}. Every note, every bend, every rhythmic detail captured accurately. PDF link in comments - use it for study, not just imitation.",
    "Lead sheet for {tune} with the real chord changes and melody as actually recorded, not the simplified Real Book version. Great for serious {style} practice and understanding the original intent.",
    "Transcribed every single note of {artist}'s work on {album}. {pages} pages total, representing months of focused listening. This is a masterclass in {concept} and worth deep study.",
    "My reharmonization of {tune} with substitutions that I've tested extensively at jam sessions. These changes work and create interesting conversation with traditional players who know the original.",
    "Walking bass line transcription for {tune} - {artist}'s approach is an absolute masterclass in note choice, voice leading, and making the bass sing. Essential study for any bassist."
  ],
  lead_sheet: [
    "Clean lead sheet for {tune} with the actually correct changes - I spent hours comparing recordings and fakebooks to get this right. No errors, ready for performance or study.",
    "My arrangement of {tune} for {ensemble}. Tried to capture the spirit of the original while making it playable by smaller groups. Free PDF for anyone who wants it.",
    "Finally cracked the correct changes for {tune} after comparing multiple recordings. The bridge was trickier than any fakebook suggested - the real harmony is much more interesting.",
    "Lead sheet featuring {artist}'s actual chord voicings for {tune} - not just the changes but how they specifically voice them. This is where the magic happens in piano accompaniment.",
    "Simplified version of {tune} for beginners who want to access this repertoire. Same essential vibe, easier changes, good stepping stone to the full arrangement later on."
  ],
  media_recommendation: [
    "Just watched {documentary} for the third time and noticed details I'd missed before. Essential viewing for any jazz fan who wants to understand what drove these artists. Highly recommended.",
    "If you haven't heard {album} by {artist}, stop whatever you're doing and listen immediately. It's one of those records that reveals new layers every single time you return to it.",
    "The jazz scenes in {movie} are surprisingly accurate and capture something essential about the music and the lifestyle. Great introduction for friends who are curious about the culture.",
    "This podcast episode about {artist} completely changed my understanding of their creative process. The stories from sidemen who worked with them are absolutely invaluable. Link in comments.",
    "Found a rare live recording of {artist} from {year}. Audio quality is rough but the playing is absolutely transcendent - you can hear them taking risks they never would in a studio setting."
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

// Generate AI-powered contextual comment using Lovable AI gateway
async function generateAIComment(
  postContent: string, 
  postTags: string[], 
  commenterProfile: { name: string; persona_profile: string } | null
): Promise<string> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  if (!lovableApiKey) {
    console.log("No LOVABLE_API_KEY, using fallback comment");
    return getFallbackComment();
  }

  const personaContext = commenterProfile?.persona_profile 
    ? `You are: ${commenterProfile.name}. ${commenterProfile.persona_profile}`
    : "You are a jazz enthusiast with deep knowledge of the music.";

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an AI jazz persona in the "Jazz is Dead" community. ${personaContext}

Write a comment responding to this post. Your comment should:
- Be 1-3 short paragraphs (150-300 characters total)
- Reference specific details from the post
- Sound like a real jazz musician or fan, not a generic assistant
- Vary sentence length and structure naturally
- Occasionally reference specific artists, tunes, albums, or jazz concepts
- Sometimes ask follow-up questions to keep the conversation going
- Never sound robotic, repetitive, or use generic phrases like "Great post!"
- Don't use hashtags or emojis`
          },
          {
            role: "user",
            content: `Post content: "${postContent}"
Post tags: ${postTags.join(", ")}

Write a natural, persona-driven comment responding to this specific post.`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return getFallbackComment();
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content && content.length > 50) {
      return content.trim();
    }
    
    return getFallbackComment();
  } catch (error) {
    console.error("Error generating AI comment:", error);
    return getFallbackComment();
  }
}

function getFallbackComment(): string {
  const fallbacks = [
    `The harmonic approach here reminds me of what ${randomChoice(ARTISTS)} was doing in the ${randomChoice(ERA_TAGS)}. There's a similar sense of space and intention in the phrasing that really lets the ideas breathe.`,
    `I've been working on something similar in my practice lately. The way ${randomChoice(CONCEPTS)} interacts with the underlying harmony is tricky, but posts like this help me hear new possibilities.`,
    `This is the kind of content that keeps me coming back to this community. Real insight from people who are doing the work, not just surface-level takes.`,
    `Interesting perspective. I'd push back a bit on the ${randomChoice(CONCEPTS)} angle - have you considered how ${randomChoice(ARTISTS)} approached this differently in their later recordings?`,
    `Been thinking about this exact thing. The ${randomChoice(INSTRUMENT_TAGS)} players from that era had such a distinct sound that's hard to replicate today, even with better gear.`,
  ];
  return randomChoice(fallbacks);
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
      const createdAt = new Date(now - randomInt(0, 3 * 24 * 60 * 60 * 1000)); // Random time in last 3 days
      
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

    // 4. Create comments (2-5 per post) using AI generation
    console.log("Creating AI-generated comments...");
    const comments = [];
    
    // Get AI profiles with persona info for contextual comments
    const { data: aiProfilesWithPersona } = await supabase
      .from('profiles')
      .select('id, name, persona_profile')
      .eq('is_ai', true);
    
    const aiProfileMap = new Map(
      (aiProfilesWithPersona || []).map(p => [p.id, { name: p.name, persona_profile: p.persona_profile }])
    );

    // Limit to first 50 posts for AI comments to avoid timeout, rest get fallback
    const postsForAI = (createdPosts || []).slice(0, 50);
    const postsForFallback = (createdPosts || []).slice(50);
    
    // Generate AI comments for first 50 posts
    for (const post of postsForAI) {
      const numComments = randomInt(2, 5);
      const postCreatedAt = new Date(post.created_at);
      
      for (let j = 0; j < numComments; j++) {
        const commenter = randomChoice(allProfiles);
        const commentTime = new Date(postCreatedAt.getTime() + randomInt(1, 48) * 60 * 60 * 1000);
        const commenterPersona = aiProfileMap.get(commenter.id) || null;
        
        // Generate AI comment
        const content = await generateAIComment(post.content, post.tags, commenterPersona);
        
        comments.push({
          post_id: post.id,
          author_id: commenter.id,
          content,
          created_at: commentTime.toISOString(),
        });
      }
      
      // Log progress every 10 posts
      if (postsForAI.indexOf(post) % 10 === 0) {
        console.log(`Generated comments for ${postsForAI.indexOf(post) + 1}/${postsForAI.length} posts`);
      }
    }
    
    // Use fallback comments for remaining posts
    for (const post of postsForFallback) {
      const numComments = randomInt(2, 5);
      const postCreatedAt = new Date(post.created_at);
      
      for (let j = 0; j < numComments; j++) {
        const commenter = randomChoice(allProfiles);
        const commentTime = new Date(postCreatedAt.getTime() + randomInt(1, 48) * 60 * 60 * 1000);
        
        comments.push({
          post_id: post.id,
          author_id: commenter.id,
          content: getFallbackComment(),
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
    console.log(`Created ${comments.length} comments (${postsForAI.length * 3} AI-generated)`);

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
