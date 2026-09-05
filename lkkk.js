/** @type {import('./_venera_.js')} */
class LKKK extends ComicSource {
  name = "极速漫画";
  key = "legacy_1kkk";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";

  get baseUrl() { return "http://www.1kkk.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? this.baseUrl + url : this.baseUrl + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  styleUrl(el) { const s = this.attr(el, "style") || ""; const m = s.match(/url\((['"]?)(.*?)\1\)/); return m ? m[2] : ""; }
  async html(url) { const res = await Network.get(url, this.headers); if (res.status !== 200) throw `请求失败：${res.status}`; return new HtmlDocument(res.body); }
  parseCards(doc) {
    const comics = [];
    let cards = [...doc.querySelectorAll(".mh-list li"), ...doc.querySelectorAll(".banner_detail_form"), ...doc.querySelectorAll(".mh-item")];
    for (const card of cards) {
      const link = card.querySelector(".title a") || card.querySelector("a");
      const image = card.querySelector("img");
      const id = this.absolute(this.attr(link, "href"));
      const title = this.text(card.querySelector(".title")) || this.attr(link, "title") || this.text(card.querySelector("h2"));
      const cover = this.attr(image, "src") || this.styleUrl(card.querySelector(".mh-cover")) || "";
      if (id && title) comics.push(new Comic({ id, title, cover }));
    }
    if (comics.length === 0) throw "没有解析到搜索结果（站点页面结构可能已更新）";
    return comics;
  }
  search = { load: async (keyword, options, page) => ({ comics: this.parseCards(await this.html(`${this.baseUrl}/search?title=${encodeURIComponent(keyword)}&language=1&page=${page}`)), maxPage: 1 }), enableTagsSuggestions: false };
  chapterUrl(id) {
    // 详情页用手机站（图片服务走 m 站更稳）
    const m = id.match(/^https?:\/\/[^\/]+(\/.*)$/);
    const path = m ? m[1] : id;
    return path.startsWith("/") ? "https://m.1kkk.com" + path : "https://m.1kkk.com/" + path;
  }
  comic = {
    loadInfo: async (id) => {
      const doc = await this.html(this.chapterUrl(id));
      const chapters = {};
      for (const link of doc.querySelectorAll(".detail-list-select li a")) {
        const url = this.chapterUrl(this.attr(link, "href"));
        const title = this.text(link);
        if (url && title) chapters[url] = title;
      }
      const tags = { "作者": [], "类型": [] };
      for (const a of doc.querySelectorAll(".detail-main-info-author a")) tags["作者"].push(this.text(a));
      for (const a of doc.querySelectorAll(".detail-main-info-class a")) tags["类型"].push(this.text(a));
      return new ComicDetails({
        title: this.text(doc.querySelector(".detail-main-info-title")) || this.text(doc.querySelector("h1")),
        cover: this.attr(doc.querySelector(".detail-main-cover img"), "src") || this.attr(doc.querySelector("img"), "src"),
        description: this.text(doc.querySelector(".detail-desc")),
        tags,
        chapters
      });
    },
    loadEp: async (comicId, epId) => {
      let url = epId;
      if (!/^https?:\/\//i.test(url)) url = this.chapterUrl(url);
      const res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `请求失败：${res.status}`;
      const body = res.body;
      let images = [];
      try {
        const m = body.match(/(eval\([\s\S]+?)<\/script/);
        if (m) {
          eval(m[1]);
          if (typeof newImgs !== "undefined" && newImgs.length) images = newImgs;
        }
      } catch (_) { }
      if (images.length === 0) {
        const doc = new HtmlDocument(body);
        for (const img of doc.querySelectorAll(".detail-content img, .content img")) {
          const src = this.attr(img, "src") || this.attr(img, "data-src");
          if (src && !src.startsWith("data:")) images.push(src);
        }
        if (images.length === 0) {
          const m2 = body.match(/"([^"]+\.(?:jpg|png|webp)[^"]*)"/g);
          if (m2) images = m2.map(x => x.slice(1, -1)).filter(x => /^https?:/.test(x));
        }
      }
      if (images.length === 0) throw "没有找到章节图片（可能被站点验证页拦截）";
      return { images };
    },
    onImageLoad: () => ({ headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://m.1kkk.com/" } })
  };
}