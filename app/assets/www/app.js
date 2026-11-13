/* ============================================================
 * RetCard 核心逻辑：地址识别（正则） + 主题渲染（Canvas） + 保存/复制
 * ============================================================ */
(function () {
  "use strict";

  var PHONE_REG = /(?:1[3-9]\d{9}|0\d{2,3}[-\s]?\d{7,8}(?:[-\s]?\d{1,6})?|(?:400|800)[-\s]?\d{3}[-\s]?\d{4})/;
  var ADDR_HINT = /(省|市|区|县|镇|乡|街道|街|路|道|巷|号|栋|幢|单元|室|楼|村|小区|园|广场|大厦|公寓|店|仓|驿站)/;
  var NAME_RE = /(收货人|收件人|寄件人|联系人|姓名|名字)[:：\s]*([^\n,，;；\d\s]{2,8})/;
  var ADDR_RE = /(地址|详细地址|收货地址|退货地址)[:：\s]*([\s\S]*?)(?=(收货人|收件人|寄件人|联系人|姓名|名字|电话|手机|手机号|联系方式)[:：\s]*|$)/;
  var LABELS = /(收货人|收件人|寄件人|联系人|姓名|名字|电话|手机|手机号|联系方式|详细地址|收货地址|退货地址|地址)[:：]+/g;

  function cleanText(s) {
    return String(s || "").replace(/\r/g, "\n").replace(/[|｜\/／、]/g, "\n")
      .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }
  function stripLabels(s) {
    return String(s || "").replace(LABELS, " ")
      .replace(/^[\s，,;；。、“”"'：:、]+/g, "").replace(/[，,;；。]+$/g, "")
      .replace(/\s{2,}/g, " ").trim();
  }
  function cleanSegment(s) {
    return stripLabels(s)
      .replace(/^[\s，,;；。、“”"'：:、]+/g, "").replace(/[\s，,;；。、“”"'：:、]+$/g, "")
      .replace(/\s*[,，、]\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  }
  function looksLikeAddress(s) {
    var t = cleanText(s);
    if (!t || t.length < 8) return false;
    return PHONE_REG.test(t) || ADDR_HINT.test(t) || (t.length > 10 && /[\u4e00-\u9fa5]/.test(t) && /\d/.test(t));
  }
  function normalizeMunicipality(s) {
    var t = String(s || "").trim(), flat = t.replace(/\s+/g, "");
    var mus = ["北京", "上海", "天津", "重庆"];
    for (var i = 0; i < mus.length; i++) {
      var withCity = mus[i] + "市";
      if (flat.indexOf(withCity + withCity) === 0) return flat;
      if (flat.indexOf(withCity) === 0) return withCity + flat;
    }
    return t;
  }

  function parseAddressText(raw) {
    var text = cleanText(raw);
    var m = text.match(PHONE_REG);
    if (!m) return { name: "", phone: "", address: text, raw: text, parsed: false };
    var phone = m[0];
    var withoutPhone = text.replace(phone, " ").replace(/\s{2,}/g, " ").trim();
    var segments = withoutPhone.split(/[\n,，;；、\/／]+/).map(cleanSegment).filter(Boolean);

    var name = "";
    var labeledName = text.match(NAME_RE);
    if (labeledName && labeledName[2]) name = stripLabels(labeledName[2]);

    var address = "";
    var labeledAddr = text.match(ADDR_RE);
    if (labeledAddr && labeledAddr[2] && ADDR_HINT.test(labeledAddr[2])) {
      address = cleanSegment(labeledAddr[2]);
    } else {
      var addrSegs = segments.filter(function (s) { return ADDR_HINT.test(s); });
      if (addrSegs.length) address = cleanSegment(addrSegs.join(" "));
    }
    if (!name) {
      for (var i = 0; i < segments.length; i++) {
        var s = segments[i];
        if (s && s.length >= 2 && s.length <= 8 && !/\d/.test(s) && !ADDR_HINT.test(s)) { name = s; break; }
      }
    }
    if (!address) {
      address = cleanSegment(segments.filter(function (s) { return s !== name; }).join(" ")) || withoutPhone;
    }
    return { name: name, phone: phone, address: normalizeMunicipality(address), raw: text, parsed: Boolean(name && address) };
  }

  function renderCard(canvas, themeKey, data) {
    var theme = window.THEMES[themeKey] || window.THEMES.paper;
    canvas.width = theme.W;
    canvas.height = theme.H;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, theme.W, theme.H);
    theme.draw(ctx, theme.W, theme.H, data);
    return canvas;
  }

  var state = { theme: "paper", form: { name: "", phone: "", address: "", days: 7 }, dataUrl: "" };
  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("show"); }, 1800);
  }

  function buildThemeList() {
    var box = $("themeList");
    box.innerHTML = "";
    Object.keys(window.THEMES).forEach(function (key) {
      var t = window.THEMES[key];
      var el = document.createElement("div");
      el.className = "chip" + (key === state.theme ? " active" : "");
      el.innerHTML = '<i class="dot" style="background:' + t.badge + '"></i><span>' + t.name + "</span>";
      el.onclick = function () {
        state.theme = key;
        Array.prototype.forEach.call(box.children, function (c) { c.classList.remove("active"); });
        el.classList.add("active");
        if (state.dataUrl) generate();
      };
      box.appendChild(el);
    });
  }

  function fillForm(p) {
    state.form.name = p.name || "";
    state.form.phone = p.phone || "";
    state.form.address = p.address || "";
    $("fName").value = state.form.name;
    $("fPhone").value = state.form.phone;
    $("fAddress").value = state.form.address;
    $("parsedCard").classList.remove("hidden");
  }

  function readForm() {
    state.form = {
      name: $("fName").value.trim(),
      phone: $("fPhone").value.trim(),
      address: $("fAddress").value.trim(),
      days: Math.max(1, Math.min(90, parseInt($("fDays").value, 10) || 7))
    };
    return state.form;
  }

  function generate() {
    var form = readForm();
    $("fDays").value = form.days;
    if (!form.name || !form.phone || !form.address) { toast("姓名 / 电话 / 地址要齐全"); return; }
    var canvas = $("canvas");
    try {
      renderCard(canvas, state.theme, form);
      state.dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      $("preview").classList.remove("hidden");
      canvas.classList.remove("hidden");
      $("previewHint").textContent = "已生成 · " + window.THEMES[state.theme].name + " · " + canvas.width + "×" + canvas.height;
      canvas.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("已生成");
    } catch (e) { toast(e.message || "生成失败"); }
  }

  function saveImage() {
    if (!state.dataUrl) { toast("先生成图片"); return; }
    var name = "retcard_" + state.theme + "_" + Date.now() + ".jpg";
    if (window.AndroidBridge && window.AndroidBridge.saveImage) {
      toast(window.AndroidBridge.saveImage(state.dataUrl, name) || "已保存");
    } else {
      var a = document.createElement("a");
      a.href = state.dataUrl; a.download = name; a.click();
      toast("已下载");
    }
  }

  function copyAddress() {
    var f = readForm();
    var text = [f.name, f.phone, f.address].filter(Boolean).join(" ");
    if (!text) { toast("没有可复制的地址"); return; }
    if (window.AndroidBridge && window.AndroidBridge.copyText) {
      window.AndroidBridge.copyText(text);
      toast("地址已复制");
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { toast("地址已复制"); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
      toast("地址已复制");
    }
  }

  function bindEvents() {
    $("btnParse").onclick = function () {
      var raw = $("rawText").value;
      if (!raw.trim()) { toast("先粘贴一段退货信息"); return; }
      var p = parseAddressText(raw);
      fillForm(p);
      toast(p.parsed ? "识别完成" : "已尽力识别，请核对下方字段");
    };
    $("btnPaste").onclick = function () {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (t) { $("rawText").value = t; toast("已粘贴"); })
          .catch(function () { toast("请长按输入框手动粘贴"); });
      } else toast("请长按输入框手动粘贴");
    };
    $("btnGenerate").onclick = generate;
    $("btnSave").onclick = saveImage;
    $("btnCopy").onclick = copyAddress;
  }

  function runDemo() {
    $("rawText").value = "收货人：张三\n电话：13800138000\n地址：浙江省杭州市余杭区文一西路969号2幢301室";
    $("btnParse").click();
    setTimeout(function () { $("btnGenerate").click(); }, 120);
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildThemeList();
    bindEvents();
    if (location.search.indexOf("demo=1") >= 0) setTimeout(runDemo, 80);
  });

  window.__retcard = { parseAddressText: parseAddressText, renderCard: renderCard, looksLikeAddress: looksLikeAddress };
})();
