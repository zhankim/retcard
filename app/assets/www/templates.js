/* 模板坐标配置（源自 utils/template-config.js，已剔除付费/广告相关字段） */
window.TEMPLATE_CONFIGS = {
  tb: {
    platform: "tb", alias: "淘淘", title: "小宝退货地址", imgKey: "tb",
    canvasWidth: 1206, canvasHeight: 2622, exportType: "jpg",
    replace: {
      time: { cover: { x: 132, y: 66, w: 176, h: 66, color: "#ffffff" },
              text: { x: 154, y: 70, fontSize: 50, fontWeight: "900", color: "#000000" } },
      returnCountdown: {
        minText: "1天00时00分", maxText: "6天23时59分", hourUnit: "时",
        cover: { x: 240, y: 596, w: 259, h: 60, color: "#fdfdfd" },
        textStyle: { x: 251, y: 608, fontSize: 42, fontWeight: "400",
                     fontFamily: "PingFang SC, Helvetica Neue, Arial, sans-serif",
                     color: "#1e1f25", charSpacing: -0.5 }
      },
      address: {
        type: "inline", mode: "tb", suffix: "配送时电话联系",
        cover: { x: 270, y: 1138, w: 842, h: 268, color: "#ffffff" },
        addressText: { x: 1096, y: 1168, compactY: 1192, longY: 1168, maxWidth: 830,
                       maxLines: 3, lineHeight: 58, fontSize: 44, fontWeight: "500",
                       color: "#191e2d", align: "right" },
        nameText: { x: 1096, y: 1286, compactY: 1250, fontSize: 44, fontWeight: "500",
                    color: "#191e2d", align: "right" },
        copyText: { x: 1096, y: 1350, fontSize: 42, fontWeight: "600", color: "#e0712d",
                    align: "right", iconSize: 32, iconGap: 12 }
      }
    }
  },

  dy: {
    platform: "dy", alias: "抖抖", title: "小音退货地址", imgKey: "dy",
    canvasWidth: 1206, canvasHeight: 2622, exportType: "jpg",
    replace: {
      time: { cover: { x: 132, y: 66, w: 176, h: 66, color: "#ffffff" },
              text: { x: 154, y: 70, fontSize: 50, fontWeight: "900", color: "#000000" } },
      returnCountdown: {
        minText: "1天00小时00分", maxText: "6天23小时59分",
        cover: { x: 576, y: 556, w: 280, h: 58, color: "#ffffff" },
        textStyle: { x: 585, y: 565, fontSize: 38, fontWeight: "500",
                     fontFamily: "PingFang SC, Helvetica Neue, Arial, sans-serif",
                     color: "#b66a7c" }
      },
      address: {
        type: "inline",
        cover: { x: 286, y: 688, w: 880, h: 214, color: "#ffffff" },
        nameText: { x: 1138, y: 730, fontSize: 38, fontWeight: "400", color: "#1b1b23", align: "right" },
        addressText: { x: 1138, y: 784, maxWidth: 835, lastLineX: 1024, lastLineMaxWidth: 742,
                       maxLines: 3, lineHeight: 50, fontSize: 38, fontWeight: "400",
                       color: "#1b1b23", align: "right" },
        copyText: { x: 1138, y: 884, fontSize: 36, fontWeight: "400", color: "#4c8ebb", align: "right",
                    text: "复制", iconX: 1034, iconSize: 26, iconGap: 8, iconYOffset: -2,
                    lastLineOffsetY: 0, centerWithLastLine: true }
      }
    }
  },

  xhs: {
    platform: "xhs", alias: "红红", title: "小薯退货地址", imgKey: "xhs",
    canvasWidth: 1200, canvasHeight: 2602, exportType: "jpg",
    replace: {
      time: { cover: { x: 116, y: 54, w: 142, h: 52, color: "#f5f5f5" },
              text: { x: 128, y: 54, fontSize: 48, fontWeight: "900", color: "#000000", charSpacing: 2 } },
      returnCountdown: {
        minText: "1天00小时", maxText: "6天26小时", includeMinutes: false,
        cover: { x: 150, y: 560, w: 220, h: 60, color: "#ffffff" },
        textStyle: { x: 158, y: 569, fontSize: 41, fontWeight: "600",
                     fontFamily: "PingFang SC, Helvetica Neue, Arial, sans-serif",
                     color: "#333333", charSpacing: 1 }
      },
      address: {
        type: "inline", mode: "single", suffix: "配送时电话联系",
        cover: { x: 330, y: 960, w: 795, h: 245, color: "#ffffff" },
        addressText: { x: 1120, y: 1008, maxWidth: 790, maxLines: 3, lineHeight: 60,
                       fontSize: 40, color: "#111111", align: "right" }
      }
    }
  },

  pdd: {
    platform: "pdd", alias: "多多", title: "小多退货地址", imgKey: "pdd",
    canvasWidth: 1206, canvasHeight: 2622, exportType: "jpg",
    replace: {
      time: { cover: { x: 140, y: 64, w: 164, h: 62, color: "#ffffff" },
              text: { x: 154, y: 70, fontSize: 50, fontWeight: "900", color: "#000000", charSpacing: 2 } },
      returnCountdown: {
        minText: "1天00小时", maxText: "6天23小时", includeMinutes: false,
        cover: { x: 146, y: 842, w: 234, h: 64, color: "#ffffff" },
        textStyle: { x: 148, y: 852, fontSize: 48, fontWeight: "400",
                     fontFamily: "PingFang SC, Helvetica Neue, Arial, sans-serif",
                     color: "#e02e24" }
      },
      address: {
        type: "card", suffix: "配送时电话联系",
        cover: { x: 84, y: 1588, w: 1034, h: 334, color: "#f7f7f7" },
        labelText: { x: 137, y: 1670, fontSize: 48, color: "#2a2a2a" },
        copyText: { x: 1066, y: 1670, fontSize: 48, color: "#2c7acf", align: "right" },
        nameText: { x: 374, y: 1670, fontSize: 48, color: "#2a2a2a" },
        addressText: { x: 137, y: 1764, maxWidth: 930, maxLines: 3, lineHeight: 74,
                       fontSize: 48, fontWeight: "400", color: "#626262" }
      }
    }
  }
};

window.PLATFORM_LIST = [
  { key: "tb",  alias: "淘淘", title: "淘宝退货", logo: "logo_tb"  },
  { key: "dy",  alias: "抖抖", title: "抖音退货", logo: "logo_dy"  },
  { key: "xhs", alias: "红红", title: "小红书退货", logo: "logo_xhs" },
  { key: "pdd", alias: "多多", title: "拼多多退货", logo: "logo_pdd" }
];
