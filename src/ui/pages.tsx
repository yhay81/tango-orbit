import { DICTIONARY_META } from "../generated/dictionary";
import { PRODUCT } from "../config/product";
import { Brand, Footer, Layout } from "./layout";

function Header() {
  return (
    <header class="topbar shell">
      <Brand />
      <span class="dictionary-status" id="dictionary-status">
        {DICTIONARY_META.entries.toLocaleString("ja-JP")}語 · {DICTIONARY_META.date}
      </span>
      <nav class="topnav" aria-label="メイン">
        <a href="/sources">出典</a>
        <a href="/privacy">プライバシー</a>
      </nav>
    </header>
  );
}

export function HomePage() {
  return (
    <Layout appScript>
      <Header />
      <main class="shell">
        <form class="search-dock" id="search-form" role="search">
          <label class="search-box">
            <span class="search-icon" aria-hidden="true"></span>
            <span hidden>日本語または英語を検索</span>
            <input
              id="search-input"
              name="q"
              type="search"
              placeholder="日本語 / English"
              autocomplete="off"
              spellcheck={false}
              disabled
            />
            <button
              class="search-clear"
              id="search-clear"
              type="button"
              aria-label="検索語を消す"
              hidden
            >
              ×
            </button>
          </label>
          <button class="search-submit" type="submit">
            調べる
          </button>
          <p class="load-error" id="load-error" role="alert" hidden>
            辞書を読み込めませんでした。通信を確認して再読み込みしてください。
          </p>
        </form>

        <div class="workspace">
          <section class="panel results-panel" aria-labelledby="results-title">
            <header class="panel-head">
              <h2 id="results-title">検索候補</h2>
              <span id="result-count">読込中</span>
            </header>
            <div class="results-list" id="results-list"></div>
          </section>

          <section class="panel definition-panel" aria-label="語義">
            <div class="orbit-canvas">
              <div class="orbit-list" id="orbit-list"></div>
              <p class="orbit-empty" id="orbit-empty" hidden>
                関連語はありません
              </p>
              <article class="word-card">
                <button
                  class="save-word"
                  id="save-word"
                  type="button"
                  aria-label="表示中の単語を単語帳へ保存"
                  data-saved="false"
                >
                  単語帳へ
                </button>
                <strong class="word-display" id="word-display">
                  …
                </strong>
                <span class="reading-display" id="reading-display">
                  辞書を読み込んでいます
                </span>
              </article>
            </div>
            <div class="sense-block">
              <h2 class="sense-heading">meanings</h2>
              <ol class="sense-list" id="sense-list"></ol>
            </div>
          </section>

          <aside class="panel saved-panel" aria-labelledby="saved-title">
            <header class="panel-head">
              <h2 id="saved-title">単語帳</h2>
              <span id="saved-count">0/40</span>
            </header>
            <div class="saved-list" id="saved-list"></div>
            <p class="saved-empty" id="saved-empty">
              しおりを押した語が
              <br />
              ここに積み上がります
            </p>
            <button class="review-start" id="review-start" type="button" disabled>
              10語をめくる
            </button>
          </aside>
        </div>
      </main>

      <section class="review-panel" id="review-panel" role="dialog" hidden>
        <article class="review-card">
          <span class="review-progress" id="review-progress"></span>
          <button class="review-close" id="review-close" type="button" aria-label="復習を閉じる">
            ×
          </button>
          <strong class="review-word" id="review-word"></strong>
          <span class="review-reading" id="review-reading"></span>
          <p class="review-meaning" id="review-meaning" hidden></p>
          <button class="review-action" id="review-reveal" type="button">
            意味を見る
          </button>
          <button class="review-action" id="review-next" type="button" hidden>
            次の語
          </button>
        </article>
      </section>
      <Footer />
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout title="プライバシー" path="/privacy">
      <Header />
      <main class="legal-page">
        <h2>プライバシー</h2>
        <h3>端末に残るもの</h3>
        <p>
          検索はダウンロード済み辞書をブラウザ内で行います。検索語と単語帳はサーバーへ送らず、この端末の
          <code>localStorage</code>にだけ保存します。ブラウザのサイトデータを消すと削除されます。
        </p>
        <h3>集計するもの</h3>
        <p>
          訪問、検索実行、単語保存、復習開始、別日再訪の回数だけを集計します。ランダムな端末IDは受信時に
          SHA-256でハッシュ化し、元の値は保存しません。検索語、表示語、保存語、IPアドレス、氏名、メールアドレスはTango
          OrbitのD1へ保存しません。
        </p>
        <h3>保存期間</h3>
        <p>集計イベントは35日後に自動削除します。外部解析SDKと広告SDKは使用しません。</p>
        <h3>連絡先</h3>
        <p>
          <a href={`${PRODUCT.repository}/issues`}>GitHub Issues</a>
        </p>
      </main>
      <Footer />
    </Layout>
  );
}

export function SourcesPage() {
  return (
    <Layout title="出典" path="/sources">
      <Header />
      <main class="legal-page">
        <h2>辞書データの出典</h2>
        <p>
          Tango Orbitの語義は、Electronic Dictionary Research and Development
          Group（EDRDG）が編纂するJMdictの英語データを使用しています。
        </p>
        <ul>
          <li>収録: {DICTIONARY_META.entries.toLocaleString("ja-JP")}語</li>
          <li>辞書日付: {DICTIONARY_META.date}</li>
          <li>配布版: {DICTIONARY_META.release}</li>
        </ul>
        <h3>ライセンス</h3>
        <p>
          JMdictとTango Orbitが配布する派生辞書データは
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">
            Creative Commons Attribution-ShareAlike 4.0 International
          </a>
          で利用できます。
        </p>
        <ul>
          <li>
            <a href="https://www.edrdg.org/edrdg/licence.html">
              EDRDG General Dictionary Licence Statement
            </a>
          </li>
          <li>
            <a href="https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html">
              JMdict/EDICT Dictionary Project
            </a>
          </li>
          <li>
            <a href="https://github.com/scriptin/jmdict-simplified">jmdict-simplified</a>
          </li>
        </ul>
        <h3>更新</h3>
        <p>公開データの新しい配布版を毎週確認し、チェックサムを検証してから辞書を再生成します。</p>
        <p>辞書データは無保証です。重要な判断では専門資料も確認してください。</p>
      </main>
      <Footer />
    </Layout>
  );
}

export function NotFoundPage() {
  return (
    <Layout title="ページが見つかりません" noIndex>
      <Header />
      <main class="not-found shell">
        <div>
          <h2>404</h2>
          <p>この軌道にページはありません。</p>
          <a href="/">辞書へ戻る</a>
        </div>
      </main>
      <Footer />
    </Layout>
  );
}
