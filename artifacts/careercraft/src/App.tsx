import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { FileText, Upload, LockKeyhole, ShieldCheck, Sparkles, X, Bookmark, MapPin, Clock3, Check, Compass, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Role = {
  id: string;
  title: string;
  department: string;
  level: string;
  work: string;
  intro: string;
  skills: string[];
};

type Match = Role & { score: number; matched: string[]; next: string[] };

const roles: Role[] = [
  {
    id: 'product-ops',
    title: 'Product Operations Associate',
    department: 'Product & Operations',
    level: 'Early career',
    work: 'Remote-friendly',
    intro: 'A bridge between customer insight, clear processes, and thoughtful product decisions.',
    skills: ['product operations', 'research', 'analytics', 'communication', 'documentation', 'SQL', 'project management'],
  },
  {
    id: 'customer-success',
    title: 'Customer Success Manager',
    department: 'Customer Experience',
    level: 'Mid-level',
    work: 'Hybrid',
    intro: 'Help customers find lasting value through strong relationships and practical problem-solving.',
    skills: ['customer success', 'account management', 'onboarding', 'retention', 'communication', 'CRM', 'training'],
  },
  {
    id: 'marketing',
    title: 'Growth Marketing Specialist',
    department: 'Marketing',
    level: 'Early career',
    work: 'Remote-friendly',
    intro: 'Turn good audience instincts into measurable campaigns and useful learning.',
    skills: ['marketing', 'campaigns', 'content', 'analytics', 'SEO', 'experimentation', 'writing'],
  },
  {
    id: 'project',
    title: 'Project Coordinator',
    department: 'Business Operations',
    level: 'Early career',
    work: 'Hybrid',
    intro: 'Keep people, timelines, and details moving together without losing sight of the why.',
    skills: ['project management', 'coordination', 'communication', 'planning', 'documentation', 'stakeholder management', 'organization'],
  },
  {
    id: 'data',
    title: 'Business Intelligence Analyst',
    department: 'Data & Insights',
    level: 'Mid-level',
    work: 'Remote-friendly',
    intro: 'Make messy questions clearer with careful analysis and a story people can use.',
    skills: ['analytics', 'SQL', 'data visualization', 'reporting', 'Excel', 'research', 'communication'],
  },
];

const sampleResume = `MORGAN LEE
Customer-focused operations professional

SUMMARY
Operations and customer success professional with 4 years of experience improving onboarding, building useful reporting, and coordinating cross-functional projects. Curious researcher and clear communicator who turns customer feedback into better processes.

EXPERIENCE
Customer Success Associate | Northstar Learning | 2021–2024
Led onboarding for 45+ small business accounts and helped improve 90-day retention by 14%.
Managed customer accounts and renewal workflows in HubSpot CRM.
Partnered with product and support teams to document recurring customer feedback and prioritize fixes.
Built Excel and SQL reports to track activation, retention, and account health.
Coordinated quarterly customer education webinars and wrote help center content.

Operations Coordinator | Fieldwork Studio | 2019–2021
Managed project timelines, stakeholder communication, and operational documentation.
Created repeatable processes that reduced handoff delays between teams.

SKILLS
Customer success, onboarding, account management, CRM, SQL, Excel, analytics, project management, research, communication, documentation, retention.`;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesTerm(text: string, term: string) {
  const cleanText = ` ${normalize(text)} `;
  const cleanTerm = normalize(term);
  return cleanText.includes(` ${cleanTerm} `) || cleanText.includes(`${cleanTerm}s `);
}

function rankRoles(text: string): Match[] {
  return roles.map((role) => {
    const matched = role.skills.filter((skill) => includesTerm(text, skill));
    const next = role.skills.filter((skill) => !matched.includes(skill)).slice(0, 3);
    return { ...role, score: Math.round((matched.length / role.skills.length) * 100), matched, next };
  }).filter((role) => role.matched.length > 0).sort((a, b) => b.score - a.score || b.matched.length - a.matched.length).slice(0, 4);
}

const demoMatches = rankRoles(sampleResume);

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ matches: Match[]; text: string; filename: string; isDemo: boolean }>({
    matches: demoMatches,
    text: sampleResume,
    filename: 'Morgan_Lee_Resume.pdf',
    isDemo: true,
  });
  const [saved, setSaved] = useState<string[]>([]);

  const signals = useMemo(() => {
    const text = result?.text ?? '';
    const topics = [
      { label: 'Customer & account care', terms: ['customer success', 'account management', 'onboarding', 'retention', 'crm'] },
      { label: 'Operations & projects', terms: ['project management', 'coordination', 'planning', 'documentation', 'operations'] },
      { label: 'Data & research', terms: ['analytics', 'sql', 'research', 'reporting', 'excel'] },
      { label: 'Writing & communication', terms: ['communication', 'writing', 'content', 'stakeholder'] },
    ];
    return topics.map((topic) => ({
      ...topic,
      count: topic.terms.filter((term) => includesTerm(text, term)).length,
      total: topic.terms.length,
    }));
  }, [result]);

  const acceptFile = (candidate?: File) => {
    setError('');
    if (!candidate) return;
    if (candidate.type !== 'application/pdf' && !candidate.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      setError('That file isn’t a PDF yet. Choose a PDF resume and we’ll take another look.');
      return;
    }
    if (candidate.size > 12 * 1024 * 1024) {
      setFile(null);
      setError('This file is over 12 MB. Try a smaller PDF so we can read it here in your browser.');
      return;
    }
    if (candidate.size === 0) {
      setFile(null);
      setError('This PDF looks empty. Choose a different copy of your resume.');
      return;
    }
    setFile(candidate);
  };

  const analyzeFile = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const bytes = await file.arrayBuffer();
      const pdfDocument = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
      const pages: string[] = [];
      const pageLimit = Math.min(pdfDocument.numPages, 30);
      for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
      }
      const extracted = pages.join('\n').trim();
      if (extracted.length < 35) {
        throw new Error('We couldn’t find readable text in this PDF. It may be a scan; try an accessible, text-based PDF instead.');
      }
      setResult({ matches: rankRoles(extracted), text: extracted, filename: file.name, isDemo: false });
      setSaved([]);
      window.setTimeout(() => document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'We couldn’t open this PDF. Try another copy of your resume.');
    } finally {
      setLoading(false);
    }
  };

  const resetDemo = () => {
    setFile(null);
    setError('');
    setSaved([]);
    setResult({ matches: demoMatches, text: sampleResume, filename: 'Morgan_Lee_Resume.pdf', isDemo: true });
    if (inputRef.current) inputRef.current.value = '';
  };

  const toggleSaved = (id: string) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const matchedTotal = result?.matches.reduce((sum, item) => sum + item.matched.length, 0) ?? 0;

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="CareerCraft home" data-testid="link-home">
          <span className="brand-mark"><Compass size={19} strokeWidth={1.8} /></span>
          <span>CareerCraft</span>
        </a>
        <nav className="top-links" aria-label="Main navigation">
          <a href="#how-it-works" data-testid="link-how-it-works">How it works</a>
          <a href="#matches" data-testid="link-examples">Example matches</a>
          <span className="nav-privacy"><LockKeyhole size={13} /> Private by design</span>
        </nav>
      </header>

      <main>
        <section className="hero-wrap">
          <div className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> A clearer way forward</div>
              <h1>Your experience has more paths than you <em>think.</em></h1>
              <p>See how the work you’ve already done connects to roles you might not have considered. No verdicts. Just a thoughtful place to start.</p>
              <div className="hero-footnote"><ShieldCheck size={15} /> Your resume is read on this device and never uploaded.</div>
            </div>

            <div className="upload-card">
              <div className="upload-head">
                <div>
                  <h2>Start with your story</h2>
                  <p>We’ll look for skills in your experience.</p>
                </div>
                <span className="file-type">PDF · up to 12 MB</span>
              </div>
              <div
                className={`dropzone${dragging ? ' dragging' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
                onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); }}
                data-testid="dropzone-resume"
              >
                {!file ? (
                  <>
                    <div className="drop-icon"><Upload size={19} strokeWidth={1.8} /></div>
                    <strong>Drop your resume here</strong>
                    <span>or choose a file from your device</span>
                    <button className="upload-button" onClick={() => inputRef.current?.click()} data-testid="button-choose-pdf">Choose a PDF</button>
                  </>
                ) : (
                  <>
                    <div className="drop-icon"><FileText size={19} strokeWidth={1.8} /></div>
                    <div className="file-selected">
                      <div className="file-selected-main">
                        <FileText size={18} />
                        <div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · ready to read locally</small></div>
                      </div>
                      <button className="remove-file" onClick={() => { setFile(null); setError(''); if (inputRef.current) inputRef.current.value = ''; }} aria-label="Remove selected resume" data-testid="button-remove-pdf"><X size={16} /></button>
                    </div>
                    <button className="analysis-button" disabled={loading} onClick={analyzeFile} data-testid="button-analyze-resume">
                      {loading ? 'Reading your experience…' : 'Explore my role matches'}
                    </button>
                    {loading && <div className="progress-line" aria-label="Reading PDF"><span /></div>}
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  hidden
                  onChange={(event) => acceptFile(event.target.files?.[0])}
                  data-testid="input-resume-pdf"
                  aria-label="Choose a PDF resume"
                />
              </div>
              {error && <p className="error-note" role="alert" data-testid="status-upload-error">{error}</p>}
              <div className="privacy-note"><LockKeyhole size={12} /> Nothing leaves your browser. No account needed.</div>
            </div>
          </div>
        </section>

        <section className="results-section" id="matches">
          <div className="results-topline">
            <div>
              <div className="section-kicker">A starting point, not a scorecard</div>
              <div className="results-heading">
                <h2>{result?.isDemo ? 'A few paths to explore' : 'Here’s where your experience connects'}</h2>
                {result?.isDemo && <span className="demo-tag">SAMPLE PROFILE</span>}
              </div>
            </div>
            <div className="results-summary" data-testid="text-match-summary">
              {result?.isDemo ? 'A preview using an example resume' : `${result?.filename} · ${result?.matches.length} illustrative matches`}
            </div>
          </div>

          {result?.matches.length ? (
            <div className="results-grid">
              <div className="matches-list" aria-live="polite" data-testid="list-role-matches">
                {result.matches.map((match, index) => (
                  <article className="match-card" key={match.id} style={{ animationDelay: `${index * 75}ms` }} data-testid={`card-role-${match.id}`}>
                    <div className="score-ring" style={{ '--score': `${match.score * 3.6}deg` } as CSSProperties} aria-label={`${match.score}% keyword overlap`}><span>{match.score}%</span></div>
                    <div className="match-main">
                      <div className="role-top">
                        <h3 className="role-title">{match.title}</h3>
                        <span className="role-level">{match.level}</span>
                      </div>
                      <div className="role-meta"><span>{match.department}</span><b>·</b><span><MapPin size={11} style={{ verticalAlign: '-2px' }} /> {match.work}</span><b>·</b><span><Clock3 size={11} style={{ verticalAlign: '-2px' }} /> Example role</span></div>
                      <p className="match-insight">{match.intro}</p>
                      <div className="skill-row">
                        <span className="skill-label">In your resume</span>
                        {match.matched.slice(0, 3).map((skill) => <span className="skill-pill" key={skill}>{skill}</span>)}
                        {match.next.slice(0, 2).map((skill) => <span className="skill-pill missing" key={skill}>Explore: {skill}</span>)}
                      </div>
                    </div>
                    <button className={`save-role${saved.includes(match.id) ? ' saved' : ''}`} onClick={() => toggleSaved(match.id)} aria-label={saved.includes(match.id) ? `Unsave ${match.title}` : `Save ${match.title}`} aria-pressed={saved.includes(match.id)} data-testid={`button-save-${match.id}`}>
                      {saved.includes(match.id) ? <Check size={15} /> : <Bookmark size={15} />}
                    </button>
                  </article>
                ))}
              </div>

              <aside className="signals-card" aria-label="Resume signals">
                <div className="signals-head"><h3>Signals we noticed</h3><Sparkles size={17} /></div>
                <p className="signals-intro">A small snapshot of themes showing up in your experience. These are clues, not limits.</p>
                {signals.map((signal) => (
                  <div className="signal" key={signal.label} data-testid={`signal-${signal.label.toLowerCase().replaceAll(' ', '-')}`}>
                    <div className="signal-title"><span>{signal.label}</span><span className="signal-count">{signal.count}</span></div>
                    <div className="signal-track"><span style={{ width: `${Math.max(5, signal.count / signal.total * 100)}%` }} /></div>
                  </div>
                ))}
                <div className="signals-foot"><ShieldCheck size={13} /> {matchedTotal} keyword connections across these role examples. Your story is bigger than a keyword list.</div>
              </aside>
            </div>
          ) : (
            <div className="empty-results" role="status" data-testid="status-no-matches">
              <Sparkles size={20} />
              <strong>Your experience is more than a set of keywords.</strong>
              <p>We didn’t find a close keyword overlap with these examples. Try a text-based PDF with more detail, or revisit your skills and projects section.</p>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
            <span style={{ color: '#858a80', fontSize: 10 }}>Illustrative role profiles only · scores reflect simple keyword overlap, not hiring outcomes.</span>
            {!result?.isDemo && <button onClick={resetDemo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 0, color: '#536a59', fontSize: 10, cursor: 'pointer' }} data-testid="button-show-demo"><RotateCcw size={12} /> Back to example</button>}
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-inner">
            <div className="how-title">
              <div className="section-kicker">Built to be useful, not mystical</div>
              <h2>A little clarity, in three thoughtful steps.</h2>
            </div>
            <div className="steps">
              <article className="step"><span className="step-number">01 / YOUR STORY</span><h3>Choose your resume</h3><p>Drop in a PDF. It stays right here on your device.</p></article>
              <article className="step"><span className="step-number">02 / THE OVERLAP</span><h3>Notice what connects</h3><p>We compare its text with a handful of sample role skills.</p></article>
              <article className="step"><span className="step-number">03 / WHAT’S NEXT</span><h3>Follow a useful thread</h3><p>Explore strengths and adjacent skills at your own pace.</p></article>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="/" data-testid="link-footer-home"><span className="brand-mark"><Compass size={17} /></span><span>CareerCraft</span></a>
        <div className="footer-note"><LockKeyhole size={12} /> Your resume never leaves this device.</div>
        <span>Made for the next step, not the whole journey.</span>
      </footer>
    </div>
  );
}

export default App;