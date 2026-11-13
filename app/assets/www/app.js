/* ============================================================
 * 退货地址制卡 · 核心逻辑（从 wxb50a621b85ec5652 剥离付费与广告后重写）
 * 仅保留：文本识别地址 → Canvas 生成退款卡图 → 复制 / 保存
 * ============================================================ */
(function () {
  "use strict";

  /* ---------------- 地址识别（移植 utils/address-parser.js） ---------------- */
  var PHONE_REG = /(?:1[3-9]\d{9}|0\d{2,3}[-\s]?\d{7,8}(?:[-\s]?\d{1,6})?|(?:400|800)[-\s]?\d{3}[-\s]?\d{4})/;
  var ADDR_HINT = /(省|市|区|县|镇|乡|街道|街|路|道|巷|号|栋|幢|单元|室|楼|村|小区|园|广场|大厦|公寓|店|仓|驿站)/;
  var NAME_RE = /(收货人|收件人|寄件人|联系人|姓名|名字)[:：\s]*([^\n,，;；\d\s]{2,8})/;
  var ADDR_RE = /(地址|详细地址|收货地址|退货地址)[:：\s]*([\s\S]*?)(?=(收货人|收件人|寄件人|联系人|姓名|名字|电话|手机|手机号|联系方式)[:：\s]*|$)/;
  var LABELS = /(收货人|收件人|寄件人|联系人|姓名|名字|电话|手机|手机号|联系方式|详细地址|收货地址|退货地址|地址)[:：]+/g;

  function cleanText(s) {
    return String(s || "")
      .replace(/\r/g, "\n")
      .replace(/[|｜\/／、]/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  function stripLabels(s) {
    return String(s || "")
      .replace(LABELS, " ")
      .replace(/^[\s，,;；。、“”"'：:、]+/g, "")
      .replace(/[，,;；。]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  function cleanSegment(s) {
    return stripLabels(s)
      .replace(/^[\s，,;；。、“”"'：:、]+/g, "")
      .replace(/[\s，,;；。、“”"'：:、]+$/g, "")
      .replace(/\s*[,，、]\s*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  function looksLikeAddress(s) {
    var t = cleanText(s);
    if (!t || t.length < 8) return false;
    var hasPhone = PHONE_REG.test(t);
    var hasPlace = ADDR_HINT.test(t);
    var zhNum = /[\u4e00-\u9fa5]/.test(t) && /\d/.test(t);
    return hasPhone || hasPlace || (t.length > 10 && zhNum);
  }
  function normalizeMunicipality(s) {
    var t = String(s || "").trim();
    var flat = t.replace(/\s+/g, "");
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
    return {
      name: name, phone: phone, address: normalizeMunicipality(address),
      raw: text, parsed: Boolean(name && address)
    };
  }

  /* ---------------- Canvas 渲染（移植 utils/canvas-renderer.js） ---------------- */
  var FONT_FALLBACK = 'PingFang SC, "Noto Sans CJK SC", "Microsoft YaHei", Helvetica Neue, Arial, sans-serif';

  function pad2(n) { return String(n).padStart(2, "0"); }
  function formatTime(d) {
    d = d || new Date();
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function applyFont(ctx, style) {
    var weight = style.fontWeight || "400";
    var family = style.fontFamily || FONT_FALLBACK;
    ctx.fillStyle = style.color;
    ctx.font = weight + " " + style.fontSize + "px " + family;
    ctx.textBaseline = "top";
    ctx.textAlign = style.align || "left";
  }
  function fillCover(ctx, cover) {
    if (!cover) return;
    ctx.fillStyle = cover.color || "#ffffff";
    ctx.fillRect(cover.x, cover.y, cover.w, cover.h);
  }
  function wrapLines(ctx, text, maxWidth, maxLines) {
    var chars = String(text || "").split("");
    var lines = [];
    var cur = "";
    chars.forEach(function (ch) {
      var next = cur + ch;
      if (ctx.measureText(next).width > maxWidth && cur) { lines.push(cur); cur = ch; }
      else cur = next;
    });
    if (cur) lines.push(cur);
    return { lines: lines.slice(0, maxLines), overflow: lines.length > maxLines };
  }
  function drawText(ctx, style, text) {
    applyFont(ctx, style);
    if (style.charSpacing) {
      var chars = String(text || "").split("");
      var offset = 0;
      chars.forEach(function (ch) {
        ctx.fillText(ch, style.x + offset, style.y);
        offset += ctx.measureText(ch).width + style.charSpacing;
      });
    } else {
      ctx.fillText(text, style.x, style.y);
    }
  }
  function drawCopyButton(ctx, style, y) {
    if (!style) return;
    var label = style.text || "复制地址";
    var merged = Object.assign({}, style, { y: y });
    var iconSize = style.iconSize || 24;
    applyFont(ctx, merged);
    var textWidth = ctx.measureText(label).width;
    var startX = style.align === "right" ? style.x - textWidth : style.x;
    var iconX = style.iconX || startX - iconSize - (style.iconGap || 10);
    var iconY = y + Math.max(0, (style.fontSize - iconSize) / 2) + (style.iconYOffset || 0);
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(iconX + 5, iconY, iconSize, iconSize);
    ctx.strokeRect(iconX, iconY + 5, iconSize, iconSize);
    ctx.restore();
    drawText(ctx, merged, label);
  }
  function appendSuffix(address, suffix) {
    var a = String(address || "").trim();
    if (suffix && a && a.indexOf(suffix) === -1) return a + suffix;
    return a;
  }
  function drawWrapped(ctx, style, text, y) {
    var baseY = typeof y === "number" ? y : style.y;
    applyFont(ctx, style);
    var wrapped = wrapLines(ctx, text, style.maxWidth, style.maxLines);
    if (wrapped.overflow) throw new Error("地址过长，请缩短后再生成");
    wrapped.lines.forEach(function (line, i) { ctx.fillText(line, style.x, baseY + i * style.lineHeight); });
    return wrapped.lines.length;
  }
  function drawRaggedBox(ctx, style, text) {
    applyFont(ctx, style);
    var maxLines = style.maxLines || 2;
    var widths = Array.from({ length: maxLines }, function (_, i) {
      return i === maxLines - 1 ? style.lastLineMaxWidth : style.maxWidth;
    });
    var chars = String(text || "").split("");
    var lines = [];
    var cur = "";
    chars.forEach(function (ch) {
      var idx = Math.min(lines.length, widths.length - 1);
      var limit = widths[idx];
      var next = cur + ch;
      if (ctx.measureText(next).width > limit && cur) { lines.push(cur); cur = ch; }
      else cur = next;
    });
    if (cur) lines.push(cur);
    if (lines.length > widths.length) throw new Error("地址过长，请缩短后再生成");
    lines.forEach(function (line, i) {
      // lastLineX 是"整段只有一行时右移"的补偿；多行时最后一行仍从 x 起排，否则会冲出画布
      var x = (lines.length === 1 && style.lastLineX) ? style.lastLineX : style.x;
      ctx.fillText(line, x, style.y + i * style.lineHeight);
    });
    return { lineCount: lines.length, lastLineY: style.y + (lines.length - 1) * style.lineHeight };
  }

  function parseCountdown(text) {
    var m = /^(\d+)天(\d+)(小时|时)(?:(\d+)分)?$/.exec(String(text || ""));
    if (!m) throw new Error("退货倒计时配置格式错误");
    return { days: Number(m[1]), hours: Number(m[2]), hourUnit: m[3], minutes: Number(m[4] || 0) };
  }
  function toMinutes(text) {
    var p = parseCountdown(text);
    return p.days * 1440 + p.hours * 60 + p.minutes;
  }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function makeCountdownText(minText, maxText, hourUnit, includeMinutes) {
    var minV = parseCountdown(minText), maxV = parseCountdown(maxText);
    if (toMinutes(minText) > toMinutes(maxText)) throw new Error("退货倒计时最小值不能大于最大值");
    if (!includeMinutes) {
      var d = randInt(minV.days, maxV.days);
      var lo = d === minV.days ? minV.hours : 0;
      var hi = d === maxV.days ? maxV.hours : 23;
      var h = randInt(lo, hi);
      return d + "天" + pad2(h) + hourUnit;
    }
    var total = randInt(toMinutes(minText), toMinutes(maxText));
    var dd = Math.floor(total / 1440);
    var hh = Math.floor((total % 1440) / 60);
    var mm = total % 60;
    return dd + "天" + pad2(hh) + hourUnit + pad2(mm) + "分";
  }

  function drawCountdown(ctx, cfg) {
    var conf = cfg.replace.returnCountdown;
    if (!conf) return;
    var includeMinutes = conf.includeMinutes !== false;
    applyFont(ctx, conf.textStyle);

    var maxWidth = ctx.measureText(conf.maxText).width;
    var text = null;
    var picked = 0;

    // 倒计时是随机值，不同数字在不同字体下宽度会有细微差异：
    // 先重试若干次取一个放得下的值，避免因随机数直接拒绝出图。
    for (var i = 0; i < 48; i++) {
      var candidate = makeCountdownText(conf.minText, conf.maxText, conf.hourUnit || "小时", includeMinutes);
      var w = ctx.measureText(candidate).width;
      if (!text || w < picked) { text = candidate; picked = w; }
      if (w <= maxWidth + 0.5) break;
    }

    // 仍放不下时按比例收字号（最低 78%），保证永远能出图
    var style = conf.textStyle;
    if (picked > maxWidth + 0.5 && picked > 0) {
      var scale = Math.max(0.78, maxWidth / picked);
      style = Object.assign({}, conf.textStyle, {
        fontSize: Math.round(conf.textStyle.fontSize * scale * 10) / 10
      });
    }

    fillCover(ctx, conf.cover);
    drawText(ctx, style, text);
  }

  function drawAddressTB(ctx, addr, form) {
    fillCover(ctx, addr.cover);
    var full = appendSuffix(form.address, addr.suffix);
    applyFont(ctx, addr.addressText);
    var wrapped = wrapLines(ctx, full, addr.addressText.maxWidth, addr.addressText.maxLines);
    if (wrapped.overflow) throw new Error("地址过长，请缩短后再生成");
    var oneLine = wrapped.lines.length <= 1;
    var y = oneLine && addr.addressText.compactY ? addr.addressText.compactY
          : (wrapped.lines.length >= 3 && addr.addressText.longY ? addr.addressText.longY : addr.addressText.y);
    drawWrapped(ctx, Object.assign({}, addr.addressText, { y: y }), full, y);
    var nameY = (oneLine && addr.nameText.compactY ? addr.nameText.compactY : y) +
                wrapped.lines.length * addr.addressText.lineHeight + 2;
    drawText(ctx, Object.assign({}, addr.nameText, { y: nameY }), form.name + "， " + form.phone);
    drawCopyButton(ctx, addr.copyText, nameY + 62);
  }

  function drawAddressInline(ctx, addr, form) {
    fillCover(ctx, addr.cover);
    if (addr.mode === "single") {
      drawWrapped(ctx, addr.addressText, form.name + " " + form.phone + " " + appendSuffix(form.address, addr.suffix));
      return;
    }
    drawText(ctx, addr.nameText, form.name + " " + form.phone);
    var last = null;
    if (addr.addressText.lastLineMaxWidth) last = drawRaggedBox(ctx, addr.addressText, appendSuffix(form.address, addr.suffix));
    else drawWrapped(ctx, addr.addressText, appendSuffix(form.address, addr.suffix));

    if (addr.separatorText) {
      drawText(ctx, last ? Object.assign({}, addr.separatorText, { y: last.lastLineY }) : addr.separatorText,
               addr.separatorText.text || "|");
    }
    if (addr.copyText) {
      // 地址折到两行以上时，把「复制」下移一行，避免与末行文字重叠
      var extraLine = last ? (addr.addressText.lineHeight || 0) : 0;   // 永远放到地址末行下一行
      var style = last
        ? Object.assign({}, addr.copyText, {
            y: last.lastLineY + extraLine +
               (addr.copyText.centerWithLastLine
                 ? ((addr.addressText.fontSize || addr.copyText.fontSize || 0) - (addr.copyText.fontSize || 0)) / 2
                 : 0) +
               (addr.copyText.lastLineOffsetY || 0)
          })
        : addr.copyText;
      if (style.iconSize) drawCopyButton(ctx, style, style.y);
      else drawText(ctx, style, addr.copyText.text || "复制");
    }
  }

  function drawAddress(ctx, cfg, form) {
    var addr = cfg.replace.address;
    if (addr.type === "jdPickup") {
      fillCover(ctx, addr.cover);
      drawWrapped(ctx, addr.text, form.name + " " + form.phone + " " + form.address);
      return;
    }
    if (addr.type === "card") {
      fillCover(ctx, addr.cover);
      drawText(ctx, addr.labelText, "商家地址：");
      drawText(ctx, addr.copyText, "复制");
      drawText(ctx, addr.nameText, form.name + " " + form.phone);
      drawWrapped(ctx, addr.addressText, appendSuffix(form.address, addr.suffix));
      return;
    }
    if (addr.mode === "tb") { drawAddressTB(ctx, addr, form); return; }
    drawAddressInline(ctx, addr, form);
  }

  function renderCard(canvas, cfg, form) {
    if (cfg.disabled) throw new Error(cfg.disabledReason || "模板维护中");
    return loadImage(window.TEMPLATE_IMG[cfg.imgKey]).then(function (img) {
      canvas.width = cfg.canvasWidth;
      canvas.height = cfg.canvasHeight;
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, cfg.canvasWidth, cfg.canvasHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cfg.canvasWidth, cfg.canvasHeight);
      ctx.drawImage(img, 0, 0, cfg.canvasWidth, cfg.canvasHeight);

      var baseW = cfg.renderBaseWidth || cfg.canvasWidth;
      var baseH = cfg.renderBaseHeight || cfg.canvasHeight;
      ctx.save();
      ctx.scale(cfg.canvasWidth / baseW, cfg.canvasHeight / baseH);
      fillCover(ctx, cfg.replace.time.cover);
      drawText(ctx, cfg.replace.time.text, formatTime());
      drawCountdown(ctx, cfg);
      drawAddress(ctx, cfg, form);
      ctx.restore();
      return canvas;
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("模板图片加载失败")); };
      img.src = src;
    });
  }

  /* ---------------- UI ---------------- */
  var state = { platform: "tb", form: { name: "", phone: "", address: "" }, dataUrl: "" };

  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("show"); }, 1800);
  }

  function buildPlatformList() {
    var box = $("platformList");
    box.innerHTML = "";
    window.PLATFORM_LIST.forEach(function (p) {
      var d = document.createElement("div");
      d.className = "chip" + (p.key === state.platform ? " active" : "");
      d.dataset.key = p.key;
      d.innerHTML = '<img src="' + (window.TEMPLATE_IMG[p.logo] || "") + '" alt=""><span>' + p.title + "</span>";
      d.onclick = function () {
        state.platform = p.key;
        Array.prototype.forEach.call(box.children, function (c) { c.classList.remove("active"); });
        d.classList.add("active");
      };
      box.appendChild(d);
    });
  }

  function fillForm(parsed) {
    state.form = { name: parsed.name || "", phone: parsed.phone || "", address: parsed.address || "" };
    $("fName").value = state.form.name;
    $("fPhone").value = state.form.phone;
    $("fAddress").value = state.form.address;
    $("parsedCard").classList.remove("hidden");
  }

  function readForm() {
    state.form = {
      name: $("fName").value.trim(),
      phone: $("fPhone").value.trim(),
      address: $("fAddress").value.trim()
    };
    return state.form;
  }

  function generate() {
    var form = readForm();
    $("fName").value = form.name;
    if (!form.name || !form.phone || !form.address) { toast("姓名 / 电话 / 地址要齐全"); return; }
    var cfg = window.TEMPLATE_CONFIGS[state.platform];
    var canvas = $("canvas");
    try {
      renderCard(canvas, cfg, form).then(function () {
        var type = cfg.exportType === "png" ? "image/png" : "image/jpeg";
        state.dataUrl = canvas.toDataURL(type, 0.95);
        $("preview").classList.remove("hidden");
        canvas.classList.remove("hidden");
        $("previewHint").textContent = "已生成 · " + cfg.alias + "模板 · " + cfg.canvasWidth + "×" + cfg.canvasHeight;
        canvas.scrollIntoView({ behavior: "smooth", block: "center" });
        toast("已生成");
      }).catch(function (e) { toast(e.message || "生成失败"); });
    } catch (e) { toast(e.message || "生成失败"); }
  }

  function saveImage() {
    if (!state.dataUrl) { toast("先生成图片"); return; }
    var name = "ret_" + state.platform + "_" + Date.now() + (state.dataUrl.indexOf("png") > 0 ? ".png" : ".jpg");
    if (window.AndroidBridge && window.AndroidBridge.saveImage) {
      var r = window.AndroidBridge.saveImage(state.dataUrl, name);
      toast(r || "已保存");
    } else {
      var a = document.createElement("a");
      a.href = state.dataUrl;
      a.download = name;
      a.click();
      toast("已下载");
    }
  }

  function copyAddress() {
    var form = readForm();
    var text = (form.name ? form.name + " " : "") + (form.phone ? form.phone + " " : "") + form.address;
    text = text.trim();
    if (!text) { toast("没有可复制的地址"); return; }
    if (window.AndroidBridge && window.AndroidBridge.copyText) {
      window.AndroidBridge.copyText(text);
      toast("地址已复制");
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { toast("地址已复制"); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("地址已复制");
    }
  }

  function bindEvents() {
    $("btnParse").onclick = function () {
      var raw = $("rawText").value;
      if (!raw.trim()) { toast("先粘贴一段退货信息"); return; }
      var parsed = parseAddressText(raw);
      fillForm(parsed);
      if (!parsed.parsed) toast("已尽力识别，请核对下方字段");
      else toast("识别完成");
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
    buildPlatformList();
    bindEvents();
    if (location.search.indexOf("demo=1") >= 0) setTimeout(runDemo, 80);
  });

  /* 暴露给二次开发 / 自动化测试 */
  window.__retcard = {
    parseAddressText: parseAddressText,
    renderCard: renderCard,
    looksLikeAddress: looksLikeAddress,
    TEMPLATE_CONFIGS: window.TEMPLATE_CONFIGS
  };
})();
