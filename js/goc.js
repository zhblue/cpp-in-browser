/*
 * goc.js — GoC 画图支持（一个文件装三样东西）
 *
 *   1) HEADER：要注入 memfs 的 goc.h 源码。画笔状态全在 guest 侧（C++ 那一侧），
 *      所以插桩调试、悬停变量、观察窗看到的 x/y/angle 就是画笔真正的位置，
 *      不需要第二条状态通道。
 *   2) makeEnv：运行 Worker 里给 wasm 用的宿主导入函数。把 __goc_* 调用攒成
 *      一批 ops，postMessage 递给主线程；字符串参数在这里就从用户线性内存
 *      解码完（Worker 才有内存，主线程在普通运行模式下没有），所以过境的
 *      已经是 JS 字符串，不会带着一份主线程读不到的指针。
 *   3) 主线程侧的画师：把 ops 画到那块垫在 stdout 背景上的 canvas。
 *
 * 为什么走 __goc_* 而不是 sysroot 里现成的 canvas_*：canvas.h 是 C++17 的
 * （它 include <string_view>），标准选 C++11 时根本编不过；而且它把 enum
 * FillRule / LineCap 写进了函数签名，我们再声明一遍就是「重复声明且类型冲突」。
 * 用自己一套导入名，两边互不相干，用户同时 include 也不会打起来。
 *
 * 坐标：GoC 的画布是 800×800、原点在正中、y 轴朝上；canvas 的坐标是左上角原点、
 * y 朝下。换算在 guest 侧做完（px = 400 + x，py = 400 − y），画师只管照数画。
 *
 * 角度：GoC 的 0 度朝正上方（12 点方向），rt 是顺时针；方向向量在世界坐标里是
 * (sin a, cos a)。弧和图形的旋转照 webGoC：canvas 角度 = GoC 角度 − 90。
 */
(function (global) {
  'use strict';

  /* ---------- 画布与配色 ---------- */
  const SIDE = 800;                         /* GoC 的画布是正方形 800×800 */
  const BG = 'rgb(188,255,209)';            /* GoC 那块浅绿底色（调色板第 16 格） */
  const INK = '#12271c';                    /* 画面亮起来之后输出区用的墨色 */
  const FONT = "Arial, 'Microsoft YaHei'";
  const D2R = Math.PI / 180;
  const CAPS = ['round', 'square', 'butt']; /* webGoC 的 cap 0/1/2 就是这三档 */

  /* ==================================================================== */
  /* 1) 要注入的头文件                                                     */
  /* ==================================================================== */
  const HEADER = `// goc.h —— GoC 画笔 API（本环境自己实现的一份，不依赖 webGoC 的运行时）
//
// 状态在编译出来的 wasm 里，画布由页面提供：
//   * 画布 800x800，原点在屏幕正中，x 向右、y 向上，两个方向都是 +-400；
//   * 角度单位是度，0 度朝正上方（12 点方向），rt 是顺时针；
//   * pen 和 p 是同一支笔（两个名字，一份状态）。
// 和 webGoC 对齐的出厂默认值：位置 (0,0)、角度 0、落笔、颜色 2（蓝）、
// 粗细 4、speed 5、帽型 round、字号 26、字体 Arial/微软雅黑、不透明度 1。
//
// speed 的分段动画照抄 webGoC 的公式（前进 rate = 2.5^s * A 像素/帧，
// 转身 rate = 1.9^s * A 度/帧，一帧 20 ms），所以 fd/rt 真是一段一段走、
// 画面一帧一帧长。sleep 睡在 Worker 里，主线程照常刷新、照常能按暂停。
// speed 取 0 或 10 表示一步画完：0 在 webGoC 里是个死循环，这里当最快速度。
//
// 没实现的东西一调就编译不过（不会跑一半才炸）：图片/声音/视频/按钮/联机
// 那一整块（pic* sound* video* ani* button* ctime cav* game* submitScore）、
// 键盘鼠标读数（getKey waitKey getMX mouseDown ...）、fill 溢色填充，
// 以及小海龟的脑袋本身（show/hide/drawH 只留接口，画布上不画头）。
// GoC 的 sin/cos/atan2 收的是角度，这里故意不去顶掉 <cmath> 的同名函数，
// 免得所有 include <cmath> 的代码一起变味；要角度版请用 sin_deg/cos_deg/atan2_deg。
// rand/srand 反过来：这里用和 <stdlib.h> 完全一样的签名重写了那两个函数，
// 链接时 libc 的 rand.o 不会被拉进来，所以 rand() 就是 GoC 那台线性同余。
#pragma once
#include <stddef.h>
#include <math.h>
#include <stdio.h>
#include <string.h>
#include <string>

extern "C" {
void __goc_clear(void);
void __goc_line(double x1, double y1, double x2, double y2, int rgb, double wide, double alpha, int cap);
void __goc_circle(double x, double y, double r, int rgb, double wide, double alpha, int cap, int fill);
void __goc_ellipse(double x, double y, double rx, double ry, double rot, int rgb, double wide, double alpha, int cap, int fill);
void __goc_arc(double x, double y, double r, double a1, double a2, int rgb, double wide, double alpha, int cap, int fill);
void __goc_rect(double x, double y, double w, double h, double rot, int rgb, double wide, double alpha, int cap, int mode);
void __goc_poly(const double *xy, int n, int rgb, double wide, double alpha, int cap, int fill);
void __goc_text(const char *s, int len, double x, double y, double size, int rgb, int left, double rot, const char *fam, int fmn);
void __goc_sleep(double ms);
int __goc_poke(double ms);
double __goc_time(void);
}

#define GOC_D2R 0.017453292519943295
#define GOC_HALF 400.0
#define GOC_FRAME 20.0
enum { GOC_PAL = 17, GOC_POLY_MAX = 512, GOC_STACK = 16 };

/* 调色板：照抄 webGoC 的 17 格，第 16 格是 pen.rgb() 写进去的那一格。
   常量初始化 + 平凡析构，所以函数内的 static 不需要初始化守卫（见下面 gocS 的说明）。 */
static inline unsigned *gocPal() {
  static unsigned tab[GOC_PAL] = {
    0x000000u, 0xff0000u, 0x0000ffu, 0x00ff00u, 0x00ffffu, 0xffff00u,
    0xa52a2au, 0x0000cdu, 0xbebebeu, 0xffc0cbu, 0x008b00u, 0x8a2be2u,
    0x008b8bu, 0xffd700u, 0xff7f24u, 0xffffffu, 0xbcffd1u
  };
  return tab;
}
/* c(n) 按下标取色：越界按 17 取模绕回来（webGoC 就是 A%B 再补正数），负数同样 */
static inline int gocRgb(int idx) {
  int i = idx % GOC_PAL;
  if (i < 0) i += GOC_PAL;
  return (int)gocPal()[i];
}

struct GoCPenState {
  double x, y, angle, speed, size, alpha;
  int color, cap, textUp, picUp, down;
  double poly[GOC_POLY_MAX];
  int polyN;
  char font[64];
  GoCPenState()
      : x(0), y(0), angle(0), speed(5), size(4), alpha(1),
        color(2), cap(0), textUp(1), picUp(1), down(1), polyN(0) {
    poly[0] = 0;
    strcpy(font, "Arial, 'Microsoft YaHei'");
  }
};
/* 那两份 GoCPenState 放在文件作用域，不走「函数内 static」：clang 8 的 wasm32 后端
   选不出线程安全初始化要用的那条原子指令（AtomicLoad acquire），所以函数里只要出现
   一个「需要动态初始化的局部 static」，编译就死在 __cxa_guard 那一步，报
   fatal error: error in backend: Cannot select。文件作用域的物体走全局构造函数，
   没有这道闸门，也正好对上「这份环境只有一个线程」。
   后面几个标量仍然是函数内的 static：常量初始化 + 平凡析构，本来就不生成守卫，
   留在函数里还能躲开 -Wunused-variable 对文件作用域 static 的抱怨。 */
static GoCPenState gocStateObj;
static GoCPenState gocStateStk[GOC_STACK];
static inline GoCPenState &gocS() { return gocStateObj; }
static inline int &gocPrec() { static int p = 2; return p; }
static inline int &gocTextSize() { static int n = 26; return n; }
static inline unsigned &gocSeed() { static unsigned sd = 0; return sd; }
static inline GoCPenState *gocStack() { return gocStateStk; }
static inline int &gocStackTop() { static int t = 0; return t; }

/* GoC 世界坐标 -> 画布像素：x 平移、y 翻过来 */
static inline double gocX(double x) { return GOC_HALF + x; }
static inline double gocY(double y) { return GOC_HALF - y; }
/* 当前朝向的单位向量（0 度朝上，顺时针为正） */
static inline double gocUX() { return sin(gocS().angle * GOC_D2R); }
static inline double gocUY() { return cos(gocS().angle * GOC_D2R); }
/* 图形/文字要不要跟着笔转：picUp、textUp 为 1 时不转，和 webGoC 一致 */
static inline double gocRot(int up) { return up ? 0.0 : gocS().angle; }
/* 图形那几个 API 的最后一参数：省略就取当前笔色 */
static inline int gocCol(int c) { return c < 0 ? gocS().color : c; }

/* webGoC 的速度公式。turn=1 问的是转身的角速度（度/帧），否则是线速度（像素/帧）。
   返回 0 表示不用分段，一步走完。 */
static inline double gocRate(double sp, double amount, int turn) {
  if (sp <= 0) return 0;
  if (turn) {
    if (sp >= 9.98) return 0;
    return pow(1.9, sp) * (sp < 7 ? 0.04 : (sp < 8 ? 0.1 : 0.3));
  }
  if (sp >= 9.99 || sp >= 10 * amount) return 0;
  double a = sp < 6 ? 0.004 : (sp < 7 ? 0.005 : (sp < 8 ? 0.006 : (sp < 9 ? 0.004 : 0.1)));
  return pow(2.5, sp) * a;
}

/* 沿单位向量 (ux,uy) 挪 step：落笔才画线，抬笔只挪位置 */
static inline void gocSlide(double ux, double uy, double step) {
  GoCPenState &s = gocS();
  double nx = s.x + ux * step, ny = s.y + uy * step;
  if (s.down)
    __goc_line(gocX(s.x), gocY(s.y), gocX(nx), gocY(ny), gocRgb(s.color), s.size, s.alpha, s.cap);
  s.x = nx;
  s.y = ny;
}

/* 沿单位向量走完 total：要么一步到位，要么按每帧 rate*GOC_FRAME 一点点走。
   后退是「方向取反、距离取正」走进来的，所以笔尖朝向不会被 fd(-x) 改掉。 */
static inline void gocRun(double ux, double uy, double total) {
  if (total < 1e-4) return;
  double rate = gocRate(gocS().speed, total, 0);
  if (rate <= 0) { gocSlide(ux, uy, total); return; }
  double per = rate * GOC_FRAME;
  double left = total;
  while (left > 1e-9) {
    double step = left < per ? left : per;
    left -= step;
    gocSlide(ux, uy, step);
    if (left > 1e-9) __goc_sleep(GOC_FRAME);
  }
}

/* 转 deg 度（顺时针为正，可为负） */
static inline void gocTurn(double deg) {
  GoCPenState &s = gocS();
  double left = fabs(deg);
  double dir = deg < 0 ? -1.0 : 1.0;
  double rate = gocRate(s.speed, left, 1);
  if (rate <= 0) { s.angle = s.angle + deg; return; }
  double per = rate * GOC_FRAME;
  while (left > 1e-9) {
    double step = left < per ? left : per;
    left -= step;
    s.angle = s.angle + dir * step;
    if (left > 1e-9) __goc_sleep(GOC_FRAME);
  }
}

/* double -> 字符串：和 webGoC 的 d2s 一样，先按 precision 定点，再去掉末尾的 0
   和多出来的小数点。precision(0) 时 webGoC 的正则会连整数尾部的 0 一起吃掉
   （10 打成 1），这里只在真有小数点时才收尾，不复刻那个 bug。 */
static inline std::string gocD2s(double v) {
  char buf[64];
  int p = gocPrec();
  if (p < 0) p = 0;
  if (p > 15) p = 15;
  snprintf(buf, sizeof buf, "%.*f", p, v);
  std::string s(buf);
  if (p > 0) {
    while (!s.empty() && s[s.size() - 1] == '0') s.erase(s.size() - 1);
    if (!s.empty() && s[s.size() - 1] == '.') s.erase(s.size() - 1);
  }
  if (s == "-0") s = "0";
  return s;
}

/* GoC 的随机数是一台 9301/49297/233280 的线性同余，出厂种子取当前毫秒 %65536。
   出值范围 0~65536，和 webGoC 的 Math.round(seed/233280*65536) 一致。 */
static inline int gocRand() {
  unsigned &sd = gocSeed();
  if (sd == 0) sd = (unsigned)(long long)__goc_time() % 65536u;
  sd = (9301u * sd + 49297u) % 233280u;
  return (int)((double)sd / 233280.0 * 65536.0 + 0.5);
}

class Pen {
 public:
  /* ---- 走与转 ---- */
  Pen fd(double d) {
    double ux = gocUX(), uy = gocUY();
    if (d < 0) { ux = -ux; uy = -uy; }
    gocRun(ux, uy, fabs(d));
    return *this;
  }
  Pen bk(double d) { return fd(-d); }
  Pen rt(double a) { gocTurn(a); return *this; }
  Pen lt(double a) { return rt(-a); }

  /* ---- 笔本身 ---- */
  Pen up() { gocS().down = 0; return *this; }
  Pen down() { gocS().down = 1; return *this; }
  Pen pu() { return up(); }
  Pen pd() { return down(); }
  Pen size(double w) { gocS().size = w; return *this; }
  Pen speed(double s) { gocS().speed = s; return *this; }
  Pen c(int i) { gocS().color = i; return *this; }
  Pen color(int i) { return c(i); }
  /* rgb(r,g,b)：写第 16 格并把它设成当前色。webGoC 只写不切，这里切了更好教 */
  Pen rgb(int r, int g, int b) {
    gocPal()[16] = (((unsigned)r & 255u) << 16) | (((unsigned)g & 255u) << 8) | ((unsigned)b & 255u);
    gocS().color = 16;
    return *this;
  }
  Pen alp(double a) { gocS().alpha = a; return *this; }
  Pen setAlpha(double a) { return alp(a); }
  double getAlpha() { return gocS().alpha; }
  Pen cap(int i) { gocS().cap = i; return *this; }
  Pen setLineCap(int i) { return cap(i); }
  int getLineCap() { return gocS().cap; }
  Pen precision(int p) { gocPrec() = p; return *this; }
  Pen textSize(double n) { gocTextSize() = (int)n; return *this; }
  Pen textU(int n) { gocS().textUp = (n % 2 == 1); return *this; }
  Pen picU(int n) { gocS().picUp = (n % 2 == 1); return *this; }
  Pen picO(int n) { gocS().picUp = (n % 2 == 1) ? 0 : 1; return *this; }
  /* 小海龟的脑袋这一版不画；接口留着，调用了只是空转，代码照样能跑 */
  Pen show() { return *this; }
  Pen hide() { return *this; }
  Pen drawH() { return *this; }

  /* ---- 位置 ---- */
  double getX() { return gocS().x; }
  double getY() { return gocS().y; }
  double getAngle() { return gocS().angle; }
  Pen setX(double v) { gocS().x = v; return *this; }
  Pen setY(double v) { gocS().y = v; return *this; }
  Pen setAngle(double v) { gocS().angle = v; return *this; }
  /* moveTo 是「抬着笔走一趟」：走完再把笔放回原来的状态 */
  Pen moveTo(double nx, double ny) {
    GoCPenState &s = gocS();
    int was = s.down;
    s.down = 0;
    lineTo(nx, ny);
    s.down = was;
    return *this;
  }
  Pen lineTo(double nx, double ny) {
    GoCPenState &s = gocS();
    double dx = nx - s.x, dy = ny - s.y;
    double len = sqrt(dx * dx + dy * dy);
    if (len < 1e-4) { s.x = nx; s.y = ny; return *this; }
    gocRun(dx / len, dy / len, len);
    return *this;
  }

  /* ---- 清屏：只回位置和角度，颜色/粗细/speed 都留着（webGoC 的 cls 就是这样） ---- */
  Pen cls() {
    __goc_clear();
    gocS().x = 0; gocS().y = 0; gocS().angle = 0;
    return *this;
  }
  Pen clss() { return cls(); }
  /* clsRec(w,h)：以笔尖为重心的那块矩形擦干净 */
  Pen clsRec(double w, double h) {
    __goc_rect(gocX(gocS().x), gocY(gocS().y), w, h, gocRot(gocS().picUp), 0, 0, 1, 0, 2);
    return *this;
  }

  /* ---- 图形：都画在笔尖位置；a/aa 的第三参数是 webGoC 的圆心标志，第四才是颜色 ---- */
  Pen r(double w, double h, int col = -1) { return gocRect(w, h, gocCol(col), 0); }
  Pen rr(double w, double h, int col = -1) { return gocRect(w, h, gocCol(col), 1); }
  Pen e(double rx, double ry, int col = -1) { return gocEll(rx, ry, gocCol(col), 0); }
  Pen ee(double rx, double ry, int col = -1) { return gocEll(rx, ry, gocCol(col), 1); }
  Pen o(double rad, int col = -1) { return gocCircle(rad, gocCol(col), 0); }
  Pen oo(double rad, int col = -1) { return gocCircle(rad, gocCol(col), 1); }
  /* pivot 那一位是 webGoC 的「圆心在笔尖还是在左边一个半径」标志，这里两种都画在
     笔尖周围（少一种姿势，但不会出现「看不出差在哪」的怪弧）；参数留着只为让
     老代码的位置对得上，所以连名字都不给，-Wextra 也挑不出未用参数。 */
  Pen a(double rad, double end, int /*pivot*/ = 1, int col = -1) { return gocArc(rad, end, gocCol(col), 0); }
  Pen aa(double rad, double end, int /*pivot*/ = 1, int col = -1) { return gocArc(rad, end, gocCol(col), 1); }

  /* polXY(x, y) 收的是绝对坐标（和 webGoC 一致：它存的点最后也是这么 +Ox、-y+Oy
     直接铺到画布上的），不跟着笔尖平移。 */
  Pen polXY(double px, double py) {
    GoCPenState &s = gocS();
    if (s.polyN + 2 <= GOC_POLY_MAX) {
      s.poly[s.polyN++] = gocX(px);
      s.poly[s.polyN++] = gocY(py);
    }
    return *this;
  }
  /* 清空点列。webGoC 画完不清，这里照办：连着 pol 两次会得到同一个不断变长的多边形，
     要重新开始就自己调一句不带参数的 polXY()。 */
  Pen polXY() { gocS().polyN = 0; return *this; }
  Pen pol(int fill = 0, int col = -1) {
    GoCPenState &s = gocS();
    if (s.polyN < 4) return *this;
    __goc_poly(s.poly, s.polyN, gocRgb(gocCol(col)), s.size, s.alpha, s.cap, fill ? 1 : 0);
    return *this;
  }

  /* ---- 文字：写在笔尖，不挪笔。三种参数的重载各留一份默认值，所以
     pen.text("字")、pen.text(s)、pen.text(3.5)、pen.text(s, 1, 40) 都能写 ---- */
  Pen text(double v, int col = -1, int size = -1) { return gocPut(gocD2s(v), col, size, 0); }
  Pen text(const char *t, int col = -1, int size = -1) { return gocPut(std::string(t), col, size, 0); }
  Pen text(std::string t, int col = -1, int size = -1) { return gocPut(t, col, size, 0); }
  Pen textL(double v, int col = -1, int size = -1) { return gocPut(gocD2s(v), col, size, 1); }
  Pen textL(const char *t, int col = -1, int size = -1) { return gocPut(std::string(t), col, size, 1); }
  Pen textL(std::string t, int col = -1, int size = -1) { return gocPut(t, col, size, 1); }
  /* webGoC 的字体按序号取，这里把序号换成浏览器里真有的名字，取不到落回默认 */
  Pen font(std::string fam) {
    GoCPenState &s = gocS();
    strncpy(s.font, fam.c_str(), sizeof s.font - 1);
    s.font[sizeof s.font - 1] = 0;
    return *this;
  }
  Pen font(int idx) { return font(gocFontName(idx)); }

  /* ---- 整支笔的存/取：webGoC 存的是画布状态，这里存的是笔的状态 ---- */
  Pen save() {
    int &t = gocStackTop();
    if (t < GOC_STACK) gocStack()[t++] = gocS();
    return *this;
  }
  Pen load() {
    int &t = gocStackTop();
    if (t > 0) gocS() = gocStack()[--t];
    return *this;
  }

 private:
  static const char *gocFontName(int idx) {
    static const char *names[7] = {
      "Arial", "Times New Roman", "Microsoft YaHei", "FangSong",
      "SimSun", "SimHei", "KaiTi"
    };
    if (idx < 0 || idx >= 7) return "Arial";
    return names[idx];
  }
  Pen gocPut(const std::string &t, int col, int size, int left) {
    GoCPenState &s = gocS();
    double fs = size > 0 ? (double)size : (double)gocTextSize();
    __goc_text(t.c_str(), (int)t.size(), gocX(s.x), gocY(s.y), fs, gocRgb(gocCol(col)),
               left, gocRot(s.textUp), s.font, (int)strlen(s.font));
    return *this;
  }
  Pen gocRect(double w, double h, int col, int fill) {
    GoCPenState &s = gocS();
    __goc_rect(gocX(s.x), gocY(s.y), w, h, gocRot(s.picUp), gocRgb(col), s.size, s.alpha, s.cap, fill);
    return *this;
  }
  Pen gocEll(double rx, double ry, int col, int fill) {
    GoCPenState &s = gocS();
    __goc_ellipse(gocX(s.x), gocY(s.y), fabs(rx), fabs(ry), gocRot(s.picUp),
                  gocRgb(col), s.size, s.alpha, s.cap, fill);
    return *this;
  }
  /* 圆走 __goc_circle（不用旋转），只有真正的椭圆才要 __goc_ellipse */
  Pen gocCircle(double rad, int col, int fill) {
    GoCPenState &s = gocS();
    __goc_circle(gocX(s.x), gocY(s.y), fabs(rad), gocRgb(col), s.size, s.alpha, s.cap, fill);
    return *this;
  }
  /* 起始角永远是笔尖正前方（picUp 时是正上方），终止角 = 起始角 + end；
     end 为负就是逆时针。webGoC 的 pivot=0 会把圆心左移一个半径再画，这里
     一律画在笔尖周围——少一种姿势，但不会出现「看不出差在哪」的怪弧。 */
  Pen gocArc(double rad, double end, int col, int fill) {
    GoCPenState &s = gocS();
    double base = gocRot(s.picUp);
    __goc_arc(gocX(s.x), gocY(s.y), fabs(rad), base, base + end, gocRgb(col),
              s.size, s.alpha, s.cap, fill);
    return *this;
  }
};

/* pen 和 p 是同一支笔：GoC 里两者都转发到同一份全局状态，这里用引用做到一样 */
Pen pen;
Pen &p = pen;

/* ---- 不带 pen. 的那几个，和 webGoC 的前置代码同一层含义 ---- */
static inline double getX() { return gocS().x; }
static inline double getY() { return gocS().y; }
static inline double getAngle() { return gocS().angle; }
static inline std::string d2s(double v) { return gocD2s(v); }
static inline void wait(double sec) { __goc_sleep(sec * 1000.0); }
/* pause() 等的是画布上的一次点击（焦点不在编辑器/输入框里时按键也算）；
   给秒数就是最多等这么多秒，等到了返回 1，超时返回 0 */
static inline int pause() { return __goc_poke(-1.0); }
static inline int pause(double sec) { return __goc_poke(sec * 1000.0); }
/* GoC 的 sin/cos 收角度：另给一组名字，不去顶掉 <cmath> 的同名函数 */
static inline double sin_deg(double a) { return sin(a * GOC_D2R); }
static inline double cos_deg(double a) { return cos(a * GOC_D2R); }
static inline double atan2_deg(double y, double x) { return atan2(y, x) / GOC_D2R; }

/* 这两个故意写成非 inline 的定义：签名和 <stdlib.h> 里的 rand/srand 逐字相同，
   所以不会有重载歧义，而链接器只为主文件里还没有的定义去翻 libc，
   于是 rand()/srand() 落到的就是 GoC 的那台线性同余。范围是 0~65536。 */
int rand() { return gocRand(); }
int rand(int lo, int hi) {
  if (hi < lo) { int t = lo; lo = hi; hi = t; }
  return lo + gocRand() % (hi - lo + 1);
}
void srand(unsigned seed) { gocSeed() = seed; }
`;

  const HEADER_PATH = 'include/goc.h';
  /* 离线版 GoC 的头叫 logo.h（里面是 #define main work_jt），
     很多教材代码写的是 #include "logo.h"，给一个同名转发文件 */
  const ALIAS_PATH = 'include/logo.h';
  const ALIAS_TEXT = `// logo.h —— 老版 GoC 的头名，转发到 goc.h
#pragma once
#include <goc.h>
`;

  /* 只认 include 指令本身，注释里提一句 goc.h 不算 */
  const RE_INCLUDE = /^[ \t]*#[ \t]*include[ \t]*[<"][ \t]*(goc|logo)\.h[>"]/m;

  function detected(source) {
    return typeof source === 'string' && RE_INCLUDE.test(source);
  }

  /* canvas_* / __goc_* 都是「链接期找不到、留给宿主」的符号，所以要 wasm-ld 放行
     未定义符号。这条旗同时也会放过写错名字的函数（错误从链接期挪到运行期），
     所以只在真的 include 了 goc.h/logo.h 时才加，别让普通算法题背这个。 */
  function ldFlags(source) {
    return detected(source) ? ['--allow-undefined'] : [];
  }

  /* sysroot 解包之后补进去，返回补了几个文件 */
  function insert(memfs) {
    let n = 0;
    const enc = new TextEncoder();
    try { memfs.addDirectory('include'); } catch (e) { /* 已经在了 */ }
    const put = (path, text) => {
      let exists = false;
      try { exists = memfs.hasFile(path); } catch (e) { /* FindNode 会 trap */ }
      if (exists) return;
      memfs.addFile(path, enc.encode(text));
      ++n;
    };
    put(HEADER_PATH, HEADER);
    put(ALIAS_PATH, ALIAS_TEXT);
    return n;
  }

  /* ==================================================================== */
  /* 2) Worker 侧：__goc_* 的宿主实现                                      */
  /* ==================================================================== */
  const GOC_SLOTS = 4;              /* [0] 点击计数 [1] 只用来睡 [2] [3] 备用 */
  const S_POKED = 0;
  const S_SLEEP = 1;
  const SLICE_MS = 50;              /* 一次最多睡这么久：片小一点，按暂停才灵 */

  /* 主线程开一次会话建一块；没有跨源隔离就没有 SharedArrayBuffer，
     这时画图仍然能用，只是不Sleep、不等点击。 */
  function newCtl() {
    if (typeof SharedArrayBuffer === 'undefined') return null;
    try {
      const sab = new SharedArrayBuffer(GOC_SLOTS * 4);
      const a = new Int32Array(sab);
      Atomics.store(a, S_POKED, 0);
      Atomics.store(a, S_SLEEP, 0);
      return sab;
    } catch (e) {
      return null;
    }
  }

  /* 主线程侧：记下「有人点了一下」，并叫醒正在等的那个 Worker */
  function poke() {
    if (!ui.ctl) return;
    const a = new Int32Array(ui.ctl);
    Atomics.add(a, S_POKED, 1);
    Atomics.notify(a, S_POKED);
  }

  function css(rgb) {
    return '#' + ('000000' + ((rgb >>> 0) & 0xffffff).toString(16)).slice(-6);
  }
  function capOf(i) {
    return CAPS[((i % 3) + 3) % 3];
  }

  /* deps: { mem() -> WasmClang.Memory|null, post(ops), ctl: Int32Array|null,
             dbg: DBG.attachControlBlock 的结果|null, onPark() }
     返回 { env, flush }：env 交给 WasiApp 当额外的 env 导入，flush 在退出前补一次。 */
  function makeEnv(deps) {
    const ops = [];
    const dec = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;
    const gk = deps.ctl || null;        /* 点击/唤醒用的那块共享内存 */
    const c = deps.dbg || null;         /* 调试会话才有的控制块 */
    const park = (c && typeof DBG !== 'undefined') ? DBG.makeParker(c, deps.onPark) : null;

    /* 字符串参数在这里就解码：canvas 的文本和字体名是 UTF-8，而
       WasmClang.Memory.readStr 是逐字节的 Latin1，中文会花，所以直接用
       TextDecoder 读原始字节。
       中间必须拷一份：调试构建链的是 --shared-memory，`m.buffer` 是一块
       SharedArrayBuffer，而 TextDecoder.decode 明确不收挂在共享内存上的视图
       （"The provided ArrayBufferView value must not be shared"）—— 普通运行
       不带那条旗，所以这个坑只在「编译并调试 + 画图 + pen.text」时踩到。
       主线程看 char[] 那段（main.js 的 charPieces）是同样处理。 */
    function text(ptr, len) {
      if (!ptr || !(len > 0)) return '';
      const m = deps.mem ? deps.mem() : null;
      if (!m) return '';
      m.check();
      if (!dec) return m.readStr(ptr, len);
      const src = new Uint8Array(m.buffer, ptr >>> 0, len | 0);
      const bytes = new Uint8Array(len | 0);   /* 普通 ArrayBuffer，长度不变 → 没截断就必是合法 UTF-8 */
      bytes.set(src);
      return dec.decode(bytes);
    }

    /* 上一次递给主线程的时刻：节流用的，见 push 里那段说明 */
    let lastFlush = 0;

    function push(op) {
      ops.push(op);
      /* 攒一批再发：一条 100 像素的线按默认速度是十几帧，一帧发一条消息会把
         通道挤满，也让主线程每一帧都被打断一次。
         但「够 128 条才发」有一个洞：`speed(10)` 那种一步画完的程序一条指令都不睡
         （`__goc_sleep` 是顺带 flush 的地方），画不满 128 条就永远不发，画面要等到
         程序结束才一次亮出来。所以再加一条时间闸：离上次递送超过一帧半就先交出去，
         最坏只让人多等 33 ms，消息量还是每秒几十条封顶。 */
      const now = Date.now();
      if (ops.length >= 128 || now - lastFlush >= 33) flush();
    }
    function flush() {
      if (!ops.length) return;
      const batch = ops.slice(0);
      ops.length = 0;
      lastFlush = Date.now();
      deps.post(batch);
    }

    /* 睡过去的这段时间里也可能该停下来等用户：动画正在走的时候按下「暂停」，
       不该等这一行跑完才生效，所以每片醒来问一次。
       这里只认「暂停」，断点和单步都交给行桩。原因：MODE 和断点表会一路保持到
       下一次点击，而一行动画要睡几十片 —— 若在切片里重走 stopReason 那套完整判定，
       「继续」放行的下一片立刻又以同一个理由停住，一次点击只走 50 ms，
       一段动画永远跑不完（实测：命中断点后点继续，40 秒还停在同一行）。
       暂停不一样，它是「越快越好」的诉求，且用户放行时必然把 MODE 改成别的。 */
    function handshake() {
      if (!c || !park) return false;
      if (Atomics.load(c.ctl, DBG.S.MODE) !== DBG.MODE.PAUSE) return false;
      park(Atomics.load(c.ctl, DBG.S.LINE), DBG.REASON.PAUSE);
      return true;
    }

    /* 心跳。转身、wait、pause 等人这几段一条绘图指令都不产生，而带画图的运行是按
       「多久没动静」判死循环的（见 main.js 的 armWatchdog）：一段 rt(180) 在 speed 5
       下能安静转两秒，不报心跳就会被当成卡死砍掉。所以每睡一小段递一个只装 beat 的
       空批次，告诉主线程「这个程序还在按时钟走」。100 ms 一次就够，别挤通道。
       代价：while(1) wait(0.1) 这种「一直有节奏地空转」的循环不再会被超时杀掉，
       只能靠「停止」——写进已知限制。 */
    let lastBeat = 0;
    function beat() {
      const now = Date.now();
      if (now - lastBeat < 100) return;
      lastBeat = now;
      deps.post([{ k: 'beat' }]);
    }

    function nap(ms) {
      let left = ms > 0 ? ms : 0;
      while (left > 0) {
        const slice = left > SLICE_MS ? SLICE_MS : left;
        left -= slice;
        if (gk) Atomics.wait(gk, S_SLEEP, 0, slice);   /* 这个槽没人写，等满就是睡满 */
        beat();
        if (handshake()) return;                       /* 停过一行了，剩下的时间不补 */
      }
    }

    function pokeWait(ms) {
      if (!gk) return 1;                /* 等不了就别把程序卡在 pause() 上 */
      const seen = Atomics.load(gk, S_POKED);
      let left = ms > 0 ? ms : Infinity;
      for (;;) {
        if (Atomics.load(gk, S_POKED) !== seen) return 1;
        if (left <= 0) return 0;
        const slice = left > SLICE_MS ? SLICE_MS : left;
        left -= slice;
        /* 期望值取当前值：计数一变，wait 就以 not-equal 立刻返回 */
        Atomics.wait(gk, S_POKED, Atomics.load(gk, S_POKED), slice);
        beat();                         /* 等人点也算动静：画面亮着，程序没死 */
        handshake();
      }
    }

    const env = {
      __goc_clear: () => push({ k: 'clear' }),
      __goc_line: (x1, y1, x2, y2, rgb, wide, alpha, cap) =>
        push({ k: 'line', x1, y1, x2, y2, c: css(rgb), w: wide, a: alpha, cap: capOf(cap) }),
      __goc_circle: (x, y, r, rgb, wide, alpha, cap, fill) =>
        push({ k: 'circle', x, y, r, c: css(rgb), w: wide, a: alpha, cap: capOf(cap), fill }),
      __goc_ellipse: (x, y, rx, ry, rot, rgb, wide, alpha, cap, fill) =>
        push({ k: 'ellipse', x, y, rx, ry, rot, c: css(rgb), w: wide, a: alpha, cap: capOf(cap), fill }),
      __goc_arc: (x, y, r, a1, a2, rgb, wide, alpha, cap, fill) =>
        push({ k: 'arc', x, y, r, a1, a2, c: css(rgb), w: wide, a: alpha, cap: capOf(cap), fill }),
      /* mode：0=描边 1=填充 2=擦除（clsRec 走的就是 2，颜色和线宽都不相干） */
      __goc_rect: (x, y, rw, rh, rot, rgb, wide, alpha, cap, mode) =>
        mode === 2
          ? push({ k: 'clearRect', x, y, rw, rh, rot })
          : push({ k: 'rect', x, y, rw, rh, rot, c: css(rgb), w: wide, a: alpha, cap: capOf(cap), fill: mode }),
      __goc_poly: (ptr, n, rgb, wide, alpha, cap, fill) => {
        const m = deps.mem ? deps.mem() : null;
        if (!m || !(n > 0)) return;
        m.check();
        const view = new Float64Array(m.buffer, ptr >>> 0, n | 0);
        push({ k: 'poly', pts: Array.prototype.slice.call(view), c: css(rgb), w: wide,
               a: alpha, cap: capOf(cap), fill });
      },
      __goc_text: (ptr, len, x, y, size, rgb, left, rot, fptr, flen) =>
        push({ k: 'text', s: text(ptr, len), x, y, size, c: css(rgb), left, rot,
               fam: (fptr && flen) ? text(fptr, flen) : FONT }),
      /* 每次睡眠前先把画面交出去：动画是一帧一帧的，攒着不发就等于不动画 */
      __goc_sleep: (ms) => { flush(); nap(ms); },
      __goc_poke: (ms) => { flush(); return pokeWait(ms); },
      __goc_time: () => Date.now(),
    };

    return { env, flush };
  }

  /* ==================================================================== */
  /* 3) 主线程侧：画在 stdout 背后的那块画布                               */
  /* ==================================================================== */
  const ui = { canvas: null, ctx: null, out: null, wrap: null, ctl: null, on: false };

  function setup(els) {
    ui.canvas = els.canvas;
    ui.out = els.out;
    ui.wrap = els.wrap;
    if (ui.canvas) ui.ctx = ui.canvas.getContext('2d');
    const hit = ui.wrap || ui.canvas;
    if (hit && !hit.__gocBound) {
      hit.__gocBound = true;
      hit.addEventListener('pointerdown', () => poke());
      /* 按键也算一次「唤醒」，对上 GoC 那句「按鼠标或按键继续」。
         只排除两处：代码编辑器（Ace 的那个隐藏 textarea）和 stdin —— 在那两个地方
         打字是写代码/喂输入，不是回应画面。输出框反过来要算：点画布时焦点几乎
         一定会落到只读的 #out 上，这时按下的键就是给 pause() 的。
         带 Ctrl/Meta/Alt 的组合键也不算（本页 Ctrl+Enter 是「编译并运行」）。 */
      document.addEventListener('keydown', (ev) => {
        if (!ui.on || ev.repeat) return;
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        const ae = document.activeElement;
        if (!ae || !ae.closest) { poke(); return; }
        if (ae.closest('#editor') || ae.id === 'stdin') return;
        poke();
      });
      if (typeof ResizeObserver !== 'undefined') {
        try { new ResizeObserver(() => layout()).observe(ui.wrap || document.body); } catch (e) { /* 忽略 */ }
      }
      window.addEventListener('resize', layout);
    }
    return ui;
  }

  /* 画布的后备存储固定 800×800，CSS 尺寸取输出框的短边：缩小着画反而更清楚
     （相当于自带抗锯齿），而拉成长方形就圆不是圆了。 */
  function layout() {
    if (!ui.canvas || !ui.on) return;
    const box = ui.wrap || ui.canvas.parentNode;
    if (!box) return;
    const side = Math.max(40, Math.min(box.clientWidth, box.clientHeight));
    ui.canvas.style.width = side + 'px';
    ui.canvas.style.height = side + 'px';
  }

  function reveal() {
    if (ui.on) return;
    ui.on = true;
    if (ui.canvas) ui.canvas.style.display = 'block';
    if (ui.out) ui.out.classList.add('goc');
    if (ui.wrap) ui.wrap.classList.add('goc');
    layout();
  }

  /* 一次运行的起点：画布收起来、底色擦干净，等第一条画图指令再露出来。
     没画图的程序看不到任何变化，输出区还是原来的样子。 */
  function reset(ctlSab) {
    ui.ctl = ctlSab || null;
    ui.on = false;
    if (ui.ctx) {
      ui.ctx.setTransform(1, 0, 0, 1, 0, 0);
      ui.ctx.globalAlpha = 1;
      ui.ctx.clearRect(0, 0, SIDE, SIDE);
    }
    if (ui.canvas) ui.canvas.style.display = 'none';
    if (ui.out) ui.out.classList.remove('goc');
    if (ui.wrap) ui.wrap.classList.remove('goc');
  }

  function paintStyle(g, c, w, a, cap) {
    g.strokeStyle = c;
    g.fillStyle = c;
    g.lineWidth = w > 0 ? w : 1;
    g.globalAlpha = (a >= 0 && a <= 1) ? a : 1;
    g.lineCap = cap || 'round';
    g.lineJoin = 'round';
  }

  function applyOps(ops) {
    const g = ui.ctx;
    if (!g || !ops || !ops.length) return;
    /* 只装心跳的批次：主线程那边拿它重置「多久没动静」的计时就够了，画面上一件事
       都没发生，这时候把绿底板子亮出来只会让人以为程序画完了个寂寞 */
    for (const op of ops) if (op.k !== 'beat') { reveal(); break; }
    for (const op of ops) {
      switch (op.k) {
        case 'clear':
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.globalAlpha = 1;
          g.clearRect(0, 0, SIDE, SIDE);
          break;
        case 'line':
          paintStyle(g, op.c, op.w, op.a, op.cap);
          g.beginPath();
          g.moveTo(op.x1, op.y1);
          g.lineTo(op.x2, op.y2);
          g.stroke();
          break;
        case 'circle':
          paintStyle(g, op.c, op.w, op.a, op.cap);
          g.beginPath();
          g.arc(op.x, op.y, Math.abs(op.r), 0, Math.PI * 2);
          if (op.fill) g.fill(); else g.stroke();
          break;
        case 'ellipse':
          g.save();
          g.translate(op.x, op.y);
          g.rotate(op.rot * D2R);
          paintStyle(g, op.c, op.w, op.a, op.cap);
          g.beginPath();
          if (g.ellipse) g.ellipse(0, 0, Math.abs(op.rx), Math.abs(op.ry), 0, 0, Math.PI * 2);
          else g.arc(0, 0, Math.max(Math.abs(op.rx), Math.abs(op.ry)), 0, Math.PI * 2);
          if (op.fill) g.fill(); else g.stroke();
          g.restore();
          break;
        case 'arc':
          paintStyle(g, op.c, op.w, op.a, op.cap);
          g.beginPath();
          /* GoC 角度 -> canvas 角度：0 度在正上方，所以整体减 90；终止角小于
             起始角就是逆时针（webGoC 用 B<0 判，这里用 a2<a1，同一件事） */
          g.arc(op.x, op.y, Math.abs(op.r), (op.a1 - 90) * D2R, (op.a2 - 90) * D2R, op.a2 < op.a1);
          if (op.fill) g.fill(); else g.stroke();
          break;
        case 'rect':
          g.save();
          g.translate(op.x, op.y);
          g.rotate(op.rot * D2R);
          paintStyle(g, op.c, op.w, op.a, op.cap);
          g.beginPath();
          g.rect(-op.rw / 2, -op.rh / 2, op.rw, op.rh);
          if (op.fill) g.fill(); else g.stroke();
          g.restore();
          break;
        case 'clearRect':
          g.save();
          g.translate(op.x, op.y);
          g.rotate(op.rot * D2R);
          g.globalAlpha = 1;
          g.clearRect(-op.rw / 2, -op.rh / 2, op.rw, op.rh);
          g.restore();
          break;
        case 'poly': {
          if (!op.pts || op.pts.length < 4) break;
          paintStyle(g, op.c, op.w, op.a, op.cap);
          g.beginPath();
          g.moveTo(op.pts[0], op.pts[1]);
          for (let i = 2; i + 1 < op.pts.length; i += 2) g.lineTo(op.pts[i], op.pts[i + 1]);
          g.closePath();
          if (op.fill) g.fill(); else g.stroke();
          break;
        }
        case 'text':
          g.save();
          g.translate(op.x, op.y);
          g.rotate(op.rot * D2R);
          paintStyle(g, op.c, 1, op.a, 'round');
          g.font = Math.max(1, op.size) + 'px ' + (op.fam || FONT);
          g.textAlign = op.left ? 'left' : 'center';
          g.textBaseline = 'middle';
          g.fillText(op.s, 0, 0);
          g.restore();
          break;
        default: break;
      }
    }
  }

  global.GOC = {
    SIDE, BG, INK, FONT, HEADER, HEADER_PATH, ALIAS_PATH, ALIAS_TEXT,
    GOC_SLOTS, S_POKED, S_SLEEP,
    detected, ldFlags, insert,
    makeEnv, newCtl, poke,
    setup, reset, applyOps, layout,
    active: () => ui.on,
    state: ui,
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
