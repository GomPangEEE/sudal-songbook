'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Song = {
  id: string
  title: string
  artist: string
  genre: string
}

type Perf = {
  song_id: string
  performed_at: string
}

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([])
  const [perfs, setPerfs] = useState<Perf[]>([])
  const [q, setQ] = useState('')
  const [genre, setGenre] = useState('전체보기')
  const [artist, setArtist] = useState('전체보기')
  const [sort, setSort] = useState('title')
  const [loading, setLoading] = useState(true)
  const [showAllArtists, setShowAllArtists] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [s, p] = await Promise.all([
        supabase.from('songs').select('id,title,artist,genre'),
        supabase
          .from('performance_entries')
          .select('song_id,performed_at'),
      ])

      if (s.error || p.error) {
        console.error(s.error || p.error)
      } else {
        setSongs(s.data || [])
        setPerfs(p.data || [])
      }

      setLoading(false)
    })()
  }, [])

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; last: string }>()

    for (const p of perfs) {
      const x = m.get(p.song_id)

      if (!x) {
        m.set(p.song_id, {
          count: 1,
          last: p.performed_at,
        })
      } else {
        x.count++

        if (p.performed_at > x.last) {
          x.last = p.performed_at
        }
      }
    }

    return m
  }, [perfs])

  const genres = useMemo(
    () => [
      '전체보기',
      ...Array.from(new Set(songs.map((s) => s.genre).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, 'ko')
      ),
    ],
    [songs]
  )

  const artists = useMemo(() => {
    const counts = new Map<string, number>()

    for (const song of songs) {
      if (!song.artist) continue

      counts.set(
        song.artist,
        (counts.get(song.artist) || 0) + 1
      )
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          a.name.localeCompare(b.name, 'ko')
      )
  }, [songs])

  const visibleArtists = showAllArtists
    ? artists
    : artists.slice(0, 10)

  const rows = useMemo(() => {
    return songs
      .filter((s) => {
        const genreMatch =
          genre === '전체보기' || s.genre === genre

        const artistMatch =
          artist === '전체보기' || s.artist === artist

        const searchMatch =
          !q ||
          `${s.title} ${s.artist}`
            .toLowerCase()
            .includes(q.toLowerCase())

        return genreMatch && artistMatch && searchMatch
      })
      .sort((a, b) => {
        if (sort === 'artist') {
          return a.artist.localeCompare(b.artist, 'ko')
        }

        if (sort === 'count') {
          return (
            (stats.get(b.id)?.count || 0) -
            (stats.get(a.id)?.count || 0)
          )
        }

        return a.title.localeCompare(b.title, 'ko')
      })
  }, [songs, q, genre, artist, sort, stats])

  const copy = (s: Song) => {
    navigator.clipboard.writeText(
      `${s.title} - ${s.artist}`
    )
  }

  return (
    <main>
      <header className="hero">
        <button className="menu" aria-label="메뉴">
          ☰
        </button>

        <div className="heroText">
          <small>♫ SONG POP</small>
          <h1>SUDAL</h1>
          <p>수달 노래책</p>
        </div>
      </header>

      <div className="songbookLayout">
        <aside className="filterPanel">
          <div className="searchBox">
            <span>⌕</span>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="곡명 또는 가수 검색"
            />
          </div>

          <section className="filterSection">
            <h3>♧ 장르</h3>

            <div className="chipList genreList">
              {genres.map((g) => (
                <button
                  key={g}
                  className={`filterChip genreChip ${
                    genre === g ? 'active' : ''
                  }`}
                  onClick={() => setGenre(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </section>

          <section className="filterSection">
            <h3>♙ 아티스트</h3>

            <div className="chipList">
              <button
                className={`filterChip artistChip ${
                  artist === '전체보기' ? 'active' : ''
                }`}
                onClick={() => setArtist('전체보기')}
              >
                전체보기
                <span>{songs.length}</span>
              </button>

              {visibleArtists.map((a) => (
                <button
                  key={a.name}
                  className={`filterChip artistChip ${
                    artist === a.name ? 'active' : ''
                  }`}
                  onClick={() => setArtist(a.name)}
                >
                  {a.name}
                  <span>{a.count}곡</span>
                </button>
              ))}

              {artists.length > 10 && (
                <button
                  className="filterChip moreChip"
                  onClick={() =>
                    setShowAllArtists((v) => !v)
                  }
                >
                  {showAllArtists
                    ? '접기'
                    : `더보기 ${artists.length - 10}`}
                </button>
              )}
            </div>
          </section>

          <section className="filterSection sortSection">
            <h3>♧ 곡 정렬</h3>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="title">제목순</option>
              <option value="artist">가수순</option>
              <option value="count">많이 부른 순</option>
            </select>
          </section>
        </aside>

        <section className="songsPanel">
          <div className="songsHeader">
            <div>
              <div className="titleLine">
                <h2>곡 목록</h2>
                <span className="resultBadge">
                  {rows.length}곡
                </span>
              </div>

              <p>다양한 장르의 노래를 만나보세요</p>
            </div>
          </div>

          {loading ? (
            <div className="state">
              노래책을 불러오는 중...
            </div>
          ) : (
            <div className="tableWrap">
              <div className="table">
                <div className="tr th">
                  <span>순번</span>
                  <span>곡명</span>
                  <span>가수</span>
                  <span>장르</span>
                  <span>총 횟수</span>
                  <span>마지막으로 부른 날짜</span>
                  <span>지난 날짜</span>
                  <span>복사</span>
                </div>

                {rows.map((s, i) => {
                  const st = stats.get(s.id)

                  const days = st
                    ? Math.floor(
                        (Date.now() -
                          new Date(st.last).getTime()) /
                          86400000
                      )
                    : null

                  return (
                    <div className="tr" key={s.id}>
                      <span className="number">
                        {i + 1}
                      </span>

                      <strong>{s.title}</strong>

                      <span>{s.artist}</span>

                      <span>
                        <span
                          className="tag"
                          data-genre={s.genre}
                        >
                          {s.genre}
                        </span>
                      </span>

                      <span className="count">
                        {st?.count || 0}회
                      </span>

                      <span>
                        {st
                          ? new Date(
                              st.last
                            ).toLocaleDateString(
                              'ko-KR'
                            )
                          : '기록 없음'}
                      </span>

                      <span className="days">
                        {days === null
                          ? '아직 부르지 않음'
                          : days === 0
                          ? '오늘'
                          : `${days}일 전`}
                      </span>

                      <button
                        className="copyButton"
                        onClick={() => copy(s)}
                        aria-label={`${s.title} 복사`}
                      >
                        ♧
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
