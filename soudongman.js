/** @type {import('./_venera_.js')} */
class Soudongman extends ComicSource {
  name = "搜动漫";
  key = "legacy_soudongman";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "http://m.soudongman.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`${this.baseUrl}/sort/all.html?key=${encodeURIComponent(keyword)}`);
      const comics = [];
      for (const card of doc.querySelectorAll(".comic-item")) {
        const link = card.querySelector("a");
        const id = this.absolute(this.attr(link, "href"));
        const title = this.text(card.querySelector(".title")) || this.text(link);
        if (id && title) comics.push(new Comic({ id, title, cover: this.absolute(this.attr(card.querySelector("img"), "data-src") || this.attr(card.querySelector("img"), "src") || ""), subTitle: this.text(card.querySelector(".chapter")) }));
      }
      if (!comics.length) throw "没有解析到搜索结果（站点页面结构可能已更新）";
      return { comics, maxPage: 1 };
    },
    enableTagsSuggestions: false
  };
  comic = {
    loadInfo: async (id) => {
      const doc = await this.html(id);
      const chapters = {};
      let links = doc.querySelectorAll("#chapter-list-1 li a");
      if (!links.length) links = doc.querySelectorAll(".chapter-list-1 li a, .list ul li a, .detail-list-select li a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) chapters[u] = t; }
      const tags = { "作者": [], "类型": [] };
      const author = this.text(doc.querySelector(".author")); if (author) tags["作者"].push(author.replace("作者：", ""));
      const kind = this.text(doc.querySelector(".tags-txt")); if (kind) for (const k of kind.split(/[,\/|]/)) if (k.trim()) tags["类型"].push(k.trim());
      return new ComicDetails({ title: this.text(doc.querySelector(".name")) || this.text(doc.querySelector("h1")), cover: this.attr(doc.querySelector(".cover img, img"), "data-src") || this.attr(doc.querySelector(".cover img, img"), "src") || "", description: this.text(doc.querySelector(".minignore")), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const res = await Network.get(epId, this.headers);
      if (res.status !== 200) throw `请求失败：${res.status}`;
      const images = [];
      const m = res.body.match(/"chapter_img_list"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
      if (m) { try { const arr = JSON.parse(m[1]); for (const u of arr) if (u && /^https?:/.test(u)) images.push(u); } catch (_) { } }
      if (!images.length) {
        const doc = new HtmlDocument(res.body);
        for (const img of doc.querySelectorAll(".content img, .reading img, img")) {
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