import React, { useEffect, useState } from 'react';
import { BookOpen, Search, ExternalLink } from 'lucide-react';
import { TUTOR_API_ENDPOINTS } from '../../../services/api/tutorApi';
import type { Book } from '../../types/exo';

interface TextbookPassage {
  id: string;
  title: string;
  chapter: string;
  page: number;
  excerpt: string;
  grade?: number;
  subject?: string;
}

interface TextbookExplorerProps {
  grade: number;
  subject: string;
  initialQuery?: string;
}

export const TextbookExplorer: React.FC<TextbookExplorerProps> = ({
  grade,
  subject,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [books, setBooks] = useState<Book[]>([]);
  const [results, setResults] = useState<TextbookPassage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(TUTOR_API_ENDPOINTS.textbooks(), { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.books)) setBooks(d.books);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function runSearch(qText?: string) {
    const term = (qText ?? query).trim();
    if (!term) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const url =
        TUTOR_API_ENDPOINTS.textbooks() +
        '?q=' +
        encodeURIComponent(term) +
        '&grade=' +
        grade +
        '&subject=' +
        encodeURIComponent(subject);
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || 'Textbook index unavailable');
      setResults(Array.isArray(data.results) ? data.results : []);
      if (Array.isArray(data.books)) setBooks(data.books);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Textbook search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="journey-card" data-testid="textbook-explorer">
      <div className="section-title">
        <div>
          <span className="tiny-label">NCERT TEXTBOOK INDEX</span>
          <h2>
            <BookOpen size={19} /> Search indexed passages &amp; citations
          </h2>
        </div>
        <span className="soft-pill">
          Class {grade} · {subject}
        </span>
      </div>

      <p className="dashboard-explainer">
        Retrieve actual indexed excerpts from the server-side NCERT textbook index
        with PDF page citations. Full files stay private on the Next.js backend.
      </p>

      <form
        className="textbook-search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
      >
        <input
          type="text"
          data-testid="textbook-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search Class ${grade} ${subject} concepts (e.g., photosynthesis, Ohm law, quadratic)…`}
          aria-label="Search NCERT textbook index"
        />
        <button
          type="submit"
          data-testid="textbook-search-btn"
          disabled={loading || !query.trim()}
        >
          <Search size={14} style={{ display: 'inline', marginRight: 5 }} />
          {loading ? 'Searching…' : 'Search index'}
        </button>
      </form>

      {error && (
        <p role="alert" className="room-error">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div data-testid="textbook-results-list">
          {results.map((r) => (
            <article key={r.id} className="textbook-result-card">
              <div className="textbook-result-meta">
                <span>
                  {r.title} · {r.chapter}
                </span>
                <span>PDF page {r.page}</span>
              </div>
              <p className="textbook-result-excerpt">{r.excerpt}</p>
            </article>
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <p className="dashboard-empty">
          No indexed OCR passages matched &ldquo;{query}&rdquo; in Class {grade}{' '}
          {subject}. Note that Class 10 Mathematics uses original curriculum lessons
          and official NCERT chapter links while local full PDF indexing is pending.
        </p>
      )}

      {books.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <span className="tiny-label">AVAILABLE INDEXED BOOKS</span>
          <div className="dashboard-topics">
            {books.map((b) => (
              <div key={b.id}>
                <b>
                  {b.title} (Class {b.grade} {b.subject})
                </b>
                <span>
                  {b.indexedChunks} indexed chunks · {b.pages} pages
                  {b.previewOnly ? ' · preview index' : ''}
                </span>
              </div>
            ))}
          </div>
          <a
            href="https://ncert.nic.in/textbook.php"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#5c73d9',
              fontSize: 11,
              fontWeight: 700,
              marginTop: 10,
              textDecoration: 'none',
            }}
          >
            Official NCERT textbook portal <ExternalLink size={12} />
          </a>
        </div>
      )}
    </section>
  );
};

