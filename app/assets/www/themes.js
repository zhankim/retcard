/* ============================================================
 * RetCard 主题绘制器 —— 纯 Canvas 绘制，零第三方素材
 * 尺寸 1080 x 1440（3:4），三套主题：paper / minimal / dark
 * ============================================================ */
(function (global) {
  "use strict";

  var W = 1080, H = 1440;
  var FONT = '"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",-apple-system,sans-serif';
  var MONO = 'ui-monospace,"SF Mono",Consolas,"Roboto Mono",monospace';

  function font(weight, size, family) { return weight + " " + size + "px " + (family || FONT); }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* 按「词」折行：连续数字/字母不拆开，避免 301 室 被断成 3 / 01 室 */
  function tokenize(text) {
    var tokens = [], buf = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (/[0-9A-Za-z]/.test(ch)) buf += ch;
      else { if (buf) { tokens.push(buf); buf = ""; } tokens.push(ch); }
    }
    if (buf) tokens.push(buf);
    return tokens;
  }

  function wrap(ctx, text, maxWidth, maxLines) {
    var tokens = tokenize(String(text || ""));
    var lines = [], cur = "";
    for (var i = 0; i < tokens.length; i++) {
      var next = cur + tokens[i];
      if (ctx.measureText(next).width > maxWidth && cur) { lines.push(cur); cur = tokens[i]; }
      else cur = next;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = last + "…";
    }
    return lines;
  }

  function spaced(ctx, text, x, y, gap) {
    var cx = x;
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text.charAt(i), cx, y);
      cx += ctx.measureText(text.charAt(i)).width + gap;
    }
  }

  function today() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate());
  }

  function iconUser(ctx, cx, cy, s, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.22, s * 0.24, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.52, s * 0.42, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    ctx.restore();
  }
  function iconPhone(ctx, cx, cy, s, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.34, cy - s * 0.34);
    ctx.quadraticCurveTo(cx - s * 0.12, cy - s * 0.10, cx + s * 0.06, cy + s * 0.06);
    ctx.quadraticCurveTo(cx + s * 0.22, cy + s * 0.22, cx + s * 0.36, cy + s * 0.36);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - s * 0.40, cy - s * 0.40, s * 0.15, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + s * 0.42, cy + s * 0.42, s * 0.15, Math.PI * 1.9, Math.PI * 0.9); ctx.stroke();
    ctx.restore();
  }
  function iconPin(ctx, cx, cy, s, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.46);
    ctx.bezierCurveTo(cx - s * 0.10, cy + s * 0.22, cx - s * 0.36, cy + s * 0.04, cx - s * 0.36, cy - s * 0.16);
    ctx.arc(cx, cy - s * 0.16, s * 0.36, Math.PI, 0);
    ctx.bezierCurveTo(cx + s * 0.36, cy + s * 0.04, cx + s * 0.10, cy + s * 0.22, cx, cy + s * 0.46);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.16, s * 0.13, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------------------------------------------
   * A · 纸张卡
   * ------------------------------------------------------------------ */
  function drawPaper(ctx, w, h, d) {
    ctx.fillStyle = "#E8E2D6";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = "#5B4B35";
    ctx.lineWidth = 2;
    for (var i = 0; i < 70; i++) {
      var ly = (i * 131) % h;
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly + ((i % 3) - 1) * 4); ctx.stroke();
    }
    ctx.restore();

    var x = 60, y = 60, cw = w - 120, ch = h - 120;
    ctx.save();
    ctx.shadowColor = "rgba(80,62,40,.20)";
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#FFFDF9";
    roundRect(ctx, x, y, cw, ch, 40);
    ctx.fill();
    ctx.restore();

    var left = x + 84, right = x + cw - 84;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    ctx.fillStyle = "#9A8F7E";
    ctx.font = font("500", 26);
    spaced(ctx, "退货寄回信息", left, y + 92, 6);

    ctx.textAlign = "right";
    ctx.fillStyle = "#BFB5A3";
    ctx.font = font("400", 26, MONO);
    ctx.fillText(today(), right, y + 92);
    ctx.textAlign = "left";

    ctx.fillStyle = "#1F1B16";
    ctx.font = font("700", 72);
    ctx.fillText(d.name || "", left, y + 190);

    ctx.fillStyle = "#6B6155";
    ctx.font = font("400", 44, MONO);
    ctx.fillText(d.phone || "", left, y + 300);

    var dy = y + 420;
    ctx.save();
    ctx.strokeStyle = "#D8CFBE";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 12]);
    ctx.beginPath(); ctx.moveTo(left, dy); ctx.lineTo(right, dy); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#A79C8B";
    ctx.font = font("500", 24);
    spaced(ctx, "寄回地址", left, dy + 56, 4);

    ctx.fillStyle = "#2A241D";
    ctx.font = font("400", 48);
    var lines = wrap(ctx, d.address, right - left, 4);
    lines.forEach(function (line, i) { ctx.fillText(line, left, dy + 124 + i * 78); });

    var py = y + ch - 330;
    ctx.strokeStyle = "#E2D9C8";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left, py - 54); ctx.lineTo(right, py - 54); ctx.stroke();

    ctx.fillStyle = "#A79C8B";
    ctx.font = font("500", 24);
    spaced(ctx, "寄回期限", left, py - 22, 4);

    ctx.fillStyle = "#8B5E34";
    ctx.font = font("700", 44);
    ctx.fillText((d.days || 7) + " 天内寄回", left, py + 26);

    ctx.fillStyle = "#C4B9A6";
    ctx.font = font("400", 24);
    ctx.fillText("请与商家核对后再寄出", left, y + ch - 96);
    ctx.textAlign = "right";
    ctx.fillStyle = "#D2C8B6";
    ctx.font = font("600", 24, MONO);
    ctx.fillText("RetCard", right, y + ch - 96);
    ctx.textAlign = "left";
  }

  /* ------------------------------------------------------------------
   * B · 极简蓝
   * ------------------------------------------------------------------ */
  function drawMinimal(ctx, w, h, d) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    var headH = 430;
    var g = ctx.createLinearGradient(0, 0, w, headH);
    g.addColorStop(0, "#2B6CF6");
    g.addColorStop(1, "#5B8DFF");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, headH);

    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.arc(w - 80, 40, 220, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w - 250, headH - 20, 130, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    var left = 84, right = w - 84;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    ctx.fillStyle = "rgba(255,255,255,.74)";
    ctx.font = font("500", 26);
    spaced(ctx, "退货信息", left, 104, 8);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = font("700", 78);
    ctx.fillText("请寄回以下地址", left, 166);

    ctx.fillStyle = "rgba(255,255,255,.84)";
    ctx.font = font("400", 30);
    ctx.fillText("核对收件人、电话与地址后再寄出", left, 292);

    var rows = [
      { icon: iconUser,  label: "收件人",   value: d.name },
      { icon: iconPhone, label: "联系电话", value: d.phone },
      { icon: iconPin,   label: "寄回地址", value: d.address, wrap: true }
    ];

    var y = headH + 64, box = 64;
    rows.forEach(function (row) {
      ctx.fillStyle = "#EEF3FF";
      roundRect(ctx, left, y, box, box, 20);
      ctx.fill();
      row.icon(ctx, left + box / 2, y + box / 2, 30, "#2B6CF6");

      var tx = left + box + 34;
      ctx.fillStyle = "#8A93A6";
      ctx.font = font("500", 24);
      ctx.fillText(row.label, tx, y + 2);

      ctx.fillStyle = "#1B1F28";
      ctx.font = font("500", 42);
      if (row.wrap) {
        var lines = wrap(ctx, row.value, right - tx, 3);
        lines.forEach(function (line, i) { ctx.fillText(line, tx, y + 44 + i * 60); });
        y += 44 + lines.length * 60 + 44;
      } else {
        ctx.fillText(row.value, tx, y + 40);
        y += 152;
      }
    });

    var pillY = h - 300;
    ctx.fillStyle = "#EEF3FF";
    roundRect(ctx, left, pillY, 420, 96, 48);
    ctx.fill();
    ctx.fillStyle = "#2B6CF6";
    ctx.font = font("600", 36);
    ctx.fillText((d.days || 7) + " 天内寄回", left + 46, pillY + 28);

    ctx.fillStyle = "#B8BFCC";
    ctx.font = font("400", 24);
    ctx.fillText("RetCard · 退货信息卡", left, h - 110);
    ctx.textAlign = "right";
    ctx.fillText(today(), right, h - 110);
    ctx.textAlign = "left";
  }

  /* ------------------------------------------------------------------
   * C · 夜间
   * ------------------------------------------------------------------ */
  function drawDark(ctx, w, h, d) {
    ctx.fillStyle = "#0F1115";
    ctx.fillRect(0, 0, w, h);

    var glow = ctx.createRadialGradient(w * 0.82, 120, 0, w * 0.82, 120, 640);
    glow.addColorStop(0, "rgba(110,231,183,.16)");
    glow.addColorStop(1, "rgba(110,231,183,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    var x = 56, y = 56, cw = w - 112, ch = h - 112;
    ctx.fillStyle = "#171A21";
    roundRect(ctx, x, y, cw, ch, 44);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 2;
    ctx.stroke();

    var left = x + 84, right = x + cw - 84;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    ctx.fillStyle = "#5B6472";
    ctx.font = font("500", 24);
    spaced(ctx, "RETURN INFO", left, y + 92, 7);

    ctx.fillStyle = "#6EE7B7";
    ctx.beginPath(); ctx.arc(right - 8, y + 104, 8, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#F2F5F8";
    ctx.font = font("700", 70);
    ctx.fillText(d.name || "", left, y + 186);

    ctx.fillStyle = "#9AA4B2";
    ctx.font = font("400", 42, MONO);
    ctx.fillText(d.phone || "", left, y + 292);

    var ly = y + 412;
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left, ly); ctx.lineTo(right, ly); ctx.stroke();

    ctx.fillStyle = "#5B6472";
    ctx.font = font("500", 24);
    spaced(ctx, "寄回地址", left, ly + 56, 4);

    ctx.fillStyle = "#D7DEE8";
    ctx.font = font("400", 44);
    var lines = wrap(ctx, d.address, right - left, 4);
    lines.forEach(function (line, i) { ctx.fillText(line, left, ly + 122 + i * 70); });

    var py = y + ch - 300;
    ctx.fillStyle = "#5B6472";
    ctx.font = font("500", 24);
    spaced(ctx, "寄回期限", left, py - 18, 4);

    ctx.fillStyle = "#6EE7B7";
    ctx.font = font("600", 42);
    ctx.fillText((d.days || 7) + " 天内寄回", left, py + 30);

    ctx.strokeStyle = "rgba(110,231,183,.32)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(left, py + 104); ctx.lineTo(left + 110, py + 104); ctx.stroke();

    ctx.fillStyle = "#3A414D";
    ctx.font = font("500", 24, MONO);
    ctx.fillText("RetCard", left, y + ch - 92);
    ctx.textAlign = "right";
    ctx.fillText(today(), right, y + ch - 92);
    ctx.textAlign = "left";
  }

  global.THEMES = {
    paper:   { key: "paper",   name: "纸张卡", badge: "#E8E2D6", draw: drawPaper,   W: W, H: H },
    minimal: { key: "minimal", name: "极简蓝", badge: "#2B6CF6", draw: drawMinimal, W: W, H: H },
    dark:    { key: "dark",    name: "夜间",   badge: "#171A21", draw: drawDark,    W: W, H: H }
  };
  global.THEME_W = W;
  global.THEME_H = H;
})(typeof window !== "undefined" ? window : this);
