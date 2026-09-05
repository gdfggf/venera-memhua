/** @type {import('./_venera_.js')} */
class Kanman extends ComicSource {
  name = "看漫画";
  key = "legacy_kanman";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://m.kanman.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  meta(doc, name) { const m = doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`); return m ? (m.attributes["content"] || "").trim() : ""; }
  async json(url, options) {
    const r = options ? await Network.post(url, options.headers || this.headers, options.body) : await Network.get(url, this.headers);
    if (r.status !== 200) throw `请求失败：${r.status}`;
    return JSON.parse(r.body);
  }
  cidOf(id) { const m = String(id).match(/\/?(\d+)\/?$/); return m ? m[1] : String(id); }
  search = {
    load: async (keyword, options, page) => {
      const data = await this.json(`${this.baseUrl}/api/serachcomic/?product_id=1&productname=kmh&platformname=wap&serachKey=${encodeURIComponent(keyword)}&topNumber=10`);
      const list = (data && data.data && data.data.data) || (data && data.data) || data || [];
      const comics = [];
      for (const it of list) {
        const id = it.comic_id || it.id;
        const title = it.comic_name || it.name;
        if (id && title) comics.push(new Comic({ id: `${this.baseUrl}/${id}/`, title, cover: it.cover || (it.comic_id ? `https://image.yqmh.com/mh/${it.comic_id}.jpg-300x400.webp` : ""), subTitle: it.latest_cartoon_topic_name || it.last_chapter_name || "" }));
      }
      if (!comics.length) throw "没有解析到搜索结果（站点页面结构可能已更新）";
      return { comics, maxPage: 1 };
    },
    enableTagsSuggestions: false
  };
  comic = {
    loadInfo: async (id) => {
      const cid = this.cidOf(id);
      const doc = await this.html(`${this.baseUrl}/${cid}/`);
      const chapters = {};
      try {
        const toc = await this.json(`${this.baseUrl}/api/getchapterlist?product_id=1&productname=kmh&platformname=wap&comic_id=${cid}`);
        const list = (toc && (toc.data || toc.list || toc.chapter)) || toc || [];
        for (const it of list) {
          const chId = it.cartoon_id || it.id || it.chapter_id;
          const name = it.cartoon_name || it.name || it.chapter_name || it.title;
          if (chId && name) chapters[`${this.baseUrl}/${cid}/${chId}/`] = name;
        }
      } catch (_) { }
      if (!Object.keys(chapters).length) {
        for (const a of doc.querySelectorAll("a")) {
          const href = this.attr(a, "href") || "";
          const t = this.text(a);
          if (t && href.includes("/" + cid + "/") && href.length > href.indexOf("/" + cid + "/") + cid.length + 3) chapters[this.absolute(href)] = t;
        }
      }
      const tags = { "作者": [], "类型": [] };
      const author = this.meta(doc, "og:novel:author"); if (author) tags["作者"].push(author);
      const kind = this.meta(doc, "og:novel:category"); if (kind) for (const k of kind.split(/[,\/|]/)) if (k.trim()) tags["类型"].push(k.trim());
      return new ComicDetails({ title: this.meta(doc, "og:novel:book_name") || this.text(doc.querySelector("h1")) || "", cover: this.attr(doc.querySelector(".cover img, img"), "src") || "", description: this.meta(doc, "og:description") || this.meta(doc, "description"), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const res = await Network.get(epId, this.headers);
      if (res.status !== 200) throw `请求失败：${res.status}`;
      const images = [];
      const m = res.body.match(/"chapter_img_list"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
      if (m) {
        try { const arr = JSON.parse(m[1]); for (const u of arr) if (u && /^https?:/.test(u)) images.push(u); } catch (_) { }
      }
      if (!images.length) {
        const doc = new HtmlDocument(res.body);
        for (const img of doc.querySelectorAll("img")) {
          const src = this.attr(img, "data-src") || this.attr(img, "src");
          if (src && /^https?:/.test(src) && !src.startsWith("data:")) images.push(src);
        }
      }
      if (!images.length) throw "没有找到章节图片（可能被站点验证页拦截）";
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}