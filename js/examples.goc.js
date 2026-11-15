/* GoC 画图示例集：纯数据，键序即展示顺序。
 *
 * GoC 的那套画笔 API（goc.h）在 js/goc.js 里定义，画布 800x800、原点在正中、
 * y 轴朝上、0 度朝正上方、角度单位是度。
 * 「GoC 可视化·*」各组是把对应算法示例画成动画的版本，算法与数据同原版。
 * 这份文件里的每个用例都是独立可跑的：拷进编辑器点「编译并运行」就行，
 * 不用额外包含别的头文件，自己带需要的辅助函数。
 */
const CPP_EXAMPLES_GOC = {
  'GoC 第一步：坐标与角度': {
    group: 'GoC 画图',
    stdin: '',
    code: `// 画布 800x800，原点在正中，x 向右、y 向上，两个方向都是 +-400。
// 角度单位是度：0 度朝正上方（12 点方向），rt 顺时针、lt 逆时针。
#include <goc.h>
#include <cstdio>

int main() {
    pen.speed(5).size(6).c(2);          // speed 5：一段一段往前走，看得清笔尖在动
    pen.fd(150);                        // 从原点朝正上方走 150
    printf("往上走 150 之后：(%.0f, %.0f) 朝向 %.0f 度\\n",
           pen.getX(), pen.getY(), pen.getAngle());

    pen.c(1).rt(90).fd(100);            // 右转 90 度（朝东）再走 100
    pen.c(3).lt(90).fd(100);            // 左转回来（又朝北）再走 100
    pen.bk(80);                         // bk 是倒退着走，笔尖朝向不变

    // pu/moveTo/pd：抬着笔搬个家，落笔继续画。moveTo 本身不留痕迹。
    pen.pu().moveTo(0, -100).pd().c(1).rt(180).fd(100);
    printf("最后停在：(%.0f, %.0f) 朝向 %.0f 度\\n",
           pen.getX(), pen.getY(), pen.getAngle());
    printf("speed(10) 或 speed(0) 是一步画完；要慢动作就用 1~9。\\n");
    return 0;
}
`,
  },
  '正多边形：外角和恒等于 360': {
    group: 'GoC 画图',
    stdin: '',
    code: `// 「走一条边 + 转 360/n 度」重复 n 次，正好回到出发点、也回到出发时的朝向
// —— 因为外角和恒等于 360 度。下面六个边数不同的多边形都从同一个点起笔。
#include <goc.h>
#include <cstdio>

void polygon(double side, int n, int col) {
    pen.c(col).pd();
    for (int i = 0; i < n; ++i) {
        pen.fd(side);
        pen.rt(360.0 / n);              // 外角
    }
}

int main() {
    pen.speed(10).size(3);
    int sides[] = {3, 4, 5, 6, 9, 12};
    double startX = -120, startY = -260;

    pen.pu().moveTo(startX, startY).pd();
    for (int i = 0; i < 6; ++i) {
        polygon(220 - i * 28, sides[i], i + 1);
        printf("%2d 边形画完，笔尖回到 (%.0f, %.0f)，朝向 %.0f 度\\n",
               sides[i], pen.getX(), pen.getY(), pen.getAngle());
    }
    return 0;
}
`,
  },
  '分形树：递归 + save/load': {
    group: 'GoC 画图',
    stdin: '',
    code: `// 递归 + 笔的状态存取：进来时 save() 一份，出去前 load() 还原，
// 于是每一层都能看到「自己进这一刀之前」的位置、朝向、粗细和颜色。
// 少了这一对，画完右枝回来时笔尖还挂在枝端，整棵树就歪了。
#include <goc.h>

void branch(double len, int depth) {
    if (depth == 0 || len < 6) return;
    pen.save();                         // 记下当前位置、朝向、笔色
    pen.size(depth > 5 ? 8 : depth)     // 树干粗、枝梢细
       .c(depth > 4 ? 6 : (depth > 2 ? 10 : 3))
       .fd(len);

    pen.rt(26); branch(len * 0.74, depth - 1);   // 右枝：画完被 load() 拉回来
    pen.lt(50); branch(len * 0.70, depth - 1);   // 左枝：同上

    pen.load();                         // 还原成进这一截之前的样子
}

int main() {
    pen.speed(10);
    pen.pu().moveTo(0, -330).pd();
    branch(120, 8);
    pen.text("递归深度 8：2^8 个枝端，save/load 让每一层都能原路退回", 0, 22);
    return 0;
}
`,
  },
  '图形全家福：描边与填充': {
    group: 'GoC 画图',
    stdin: '',
    code: `// 图形类函数都画在「笔尖所在位置」：r/rr 矩形、e/ee 椭圆、o/oo 圆、a/aa 圆弧。
// 单写是描边，双写是实心；最后一个参数是颜色序号，省略就用当前笔色。
// a/aa 从笔尖正前方开始扫，第二个参数是扫过的角度（负数逆时针）。
#include <goc.h>

int main() {
    pen.speed(10).size(5);
    double xs[4] = {-300, -100, 100, 300};
    const char *name[4] = {"r / rr  矩形", "e / ee  椭圆", "o / oo  圆", "a / aa  弧 270 度"};

    for (int i = 0; i < 4; ++i) {
        pen.c(i + 1).pu().moveTo(xs[i], 220).pd();
        if (i == 0) pen.r(130, 90);
        else if (i == 1) pen.e(70, 45);
        else if (i == 2) pen.o(58);
        else pen.a(58, 270);
        pen.text(name[i], 0, 20);

        pen.c(i + 5).pu().moveTo(xs[i], -120).pd();
        if (i == 0) pen.rr(130, 90);
        else if (i == 1) pen.ee(70, 45);
        else if (i == 2) pen.oo(58);
        else pen.aa(58, 270);
        pen.text("实心那一排", 0, 18);
    }

    // 多边形：polXY 逐个记点（收的是画布绝对坐标），pol 一次画完
    pen.c(11).pu().moveTo(-60, -280).pd();
    pen.polXY(-60, -280).polXY(60, -280).polXY(90, -340).polXY(-30, -360).pol(1, 12);
    return 0;
}
`,
  },
  '随机漫步：rand + 按键继续': {
    group: 'GoC 画图',
    stdin: '',
    code: `// GoC 那套随机数：srand(定种子) 让画面可复现，rand(lo, hi) 直接在区间里取值。
// pause(秒) = 在画布上点一下（或按任意键）就继续，等满了就自己往下走。
#include <goc.h>
#include <cstdio>
#include <cmath>

int main() {
    pen.speed(10).size(3).c(2);
    pen.pu().moveTo(0, 0).pd();
    srand(2024);

    for (int i = 1; i <= 200; ++i) {
        pen.rt(rand(0, 359)).fd(rand(8, 34));
        // 快走出画面了就悄悄搬回中心：moveTo 抬着笔走，不留痕迹
        if (fabs(pen.getX()) > 340 || fabs(pen.getY()) > 340) pen.moveTo(0, 0);
        if (i % 50 == 0)
            printf("走了 %d 步，现在在 (%.0f, %.0f)\\n", i, pen.getX(), pen.getY());
        if (i == 100) {
            printf("画面上点一下鼠标（或按一下键）继续，最多等 20 秒。\\n");
            int woken = pause(20.0);
            printf(woken ? "等到了点击。\\n" : "20 秒到了，自己往下走。\\n");
            pen.c(1).size(6);           // 后半程换个颜色
        }
    }
    printf("一共 200 步，终点 (%.0f, %.0f)。\\n", pen.getX(), pen.getY());
    return 0;
}
`,
  },
  '时钟表盘：极坐标与文字': {
    group: 'GoC 画图',
    stdin: '',
    code: `// 0 度朝上、顺时针为正，所以「半径 r、角度 a」换成坐标就是 (r*sin(a), r*cos(a))。
// sin_deg / cos_deg 收的是角度（<cmath> 里的 sin/cos 收弧度，两者都留着）。
#include <goc.h>

double px(double r, double deg) { return r * sin_deg(deg); }
double py(double r, double deg) { return r * cos_deg(deg); }

void hand(double deg, double len, double wide, int col) {
    pen.pu().moveTo(0, 0).pd().c(col).size(wide).setAngle(deg).fd(len);
}

int main() {
    pen.speed(10).c(0);
    pen.o(320);                                     // 外圈：圆画在笔尖位置，此刻笔尖在原点

    for (int i = 0; i < 60; ++i) {                   // 60 个刻度，整点那 12 个又长又粗
        double a = i * 6.0;                          // 一分钟走 6 度
        int major = (i % 5 == 0);
        pen.pu().moveTo(px(312, a), py(312, a)).pd();
        pen.size(major ? 6 : 2).setAngle(a).bk(major ? 34 : 14);   // bk：朝圆心里走
    }

    for (int h = 1; h <= 12; ++h) {                  // 数字：text 写在笔尖，不挪笔
        pen.pu().moveTo(px(248, h * 30.0), py(248, h * 30.0));
        pen.text(d2s(h), 0, 34);
    }

    hand(30.0 * 7 + 15, 150, 12, 2);                 // 7 点半：时针在 7 与 8 正中间
    hand(6.0 * 30, 235, 7, 1);                       // 分针指着 6
    pen.c(0).pu().moveTo(-150, -378);
    pen.text("d2s 把数字写成字符串，text 画在笔尖", 0, 22);
    return 0;
}
`,
  },
  '五星红旗：国标网格与多边形': {
    group: 'GoC 画图',
    stdin: '',
    code: `// 国旗的旗面是 30 x 20 的格子，这里取 1 格 = 20 像素，于是旗面 600 x 400，
// 正好铺在 800 x 800 画布的正中。网格坐标 (i, j) 从左上角数起：i 向右、j 向下，
// 换算成 GoC 坐标（y 朝上）就是下面这两个函数。
// polXY 收的是画布绝对坐标：点攒够了，pol 一次画完。
#include <goc.h>
#include <cstdio>

const double U = 20.0;                             // 一格多少像素
double gxi(double i) { return -300.0 + i * U; }      // 第 i 列
double gyi(double j) { return  200.0 - j * U; }      // 第 j 行

// 五角星：外半径 R，内半径 0.381966 * R（正五角星的比例），一共 10 个顶点。
// aim 是「正对出去的那个角」的朝向，沿用 GoC 的角度约定：0 度朝正上，顺时针为正。
void star(double cx, double cy, double R, double aim) {
    double r = R * 0.3819660113;
    pen.polXY();                                    // 不带参数 = 清空点列
    for (int i = 0; i < 10; i++) {
        double rad = (i % 2 == 0) ? R : r;           // 偶数个点是外角，奇数个点是内角
        double a = (aim + i * 36.0) * GOC_D2R;
        pen.polXY(cx + rad * sin(a), cy + rad * cos(a));
    }
    pen.pol(1);                                     // 1 = 填充
}

int main() {
    pen.speed(10).up();

    // 旗面：rr 画的矩形以笔尖为重心，笔停在原点就正好铺满 600 x 400
    pen.rgb(222, 41, 16);                            // 国旗红
    pen.moveTo(0, 0);
    pen.rr(30 * U, 20 * U);

    // 大星：圆心在网格 (5,5)，外接圆半径 3 格，一个角朝正上
    pen.rgb(255, 222, 0);                            // 五星黄
    star(gxi(5), gyi(5), 3 * U, 0);

    // 四颗小星：圆心在 (10,2)(12,4)(12,7)(10,9)，半径 1 格，
    // 每颗都有一个角正对大星的圆心 —— 国标说的「众星拱北」
    int sx[4] = {10, 12, 12, 10};
    int sy[4] = { 2,  4,  7,  9};
    double bx = gxi(5), by = gyi(5);
    for (int i = 0; i < 4; i++) {
        double cx = gxi(sx[i]), cy = gyi(sy[i]);
        double aim = atan2_deg(bx - cx, by - cy);     // 指向大星圆心的那个方向
        star(cx, cy, U, aim);
        printf("第 %d 颗小星在网格 (%d,%d)，正对大星的方向是 %.0f 度。\\n",
               i + 1, sx[i], sy[i], aim);
    }
    return 0;
}
`,
  },

  '鹈鹕骑自行车：逐帧重画与反解算': {
    group: 'GoC 画图',
    stdin: '',
    code: `// 这段动画不是「一笔画完」，而是每帧擦掉重画一遍：擦完画地面、车架、车轮、
// 身子、翅膀、腿、嘴，一帧一帧推过去。
// 三个动作共用同一个曲柄角 th：辐条跟着 th 转，脚踩在 th 算出来的脚踏上，
// 地面的路标每帧往前挪一点（跑起来的感觉就是这么来的）。
// 膝盖不写死，是反解算出来的：脚在哪儿知道、髋在哪儿知道、两根骨头多长知道，
// 解出膝盖在哪儿；再取朝前（+x）的那一个解，就是骑车人的膝盖。
// 调试时记得把「调试速度」调到最快：一行 0.2 秒的话，60 帧要走上好几分钟。
#include <goc.h>
#include <cstdio>
#include <cmath>

const double GY = -250;                 // 地面
const double WR = 78;                   // 轮子半径
const double RX = -140, FY = 140;       // 后轮 / 前轮 的 x
const double WY = GY + WR;              // 轮心高度：轮子正好落地
const double CX = -20, CY = WY + 12;    // 中轴（曲柄中心）
const double SX = -82, SY = -58;        // 座管顶
const double HX = 96, HY = -46;         // 车把立管顶
const double CR = 30;                   // 曲柄长度
const double PI = 3.14159265358979324;

void col(int r, int g, int b) { pen.rgb(r, g, b); }

// 从 (x1,y1) 画一条粗细 w 的线段到 (x2,y2)：角度按 GoC 的约定算，0 度朝正上
void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void circ(double cx, double cy, double r, bool fill) {
    pen.pu().moveTo(cx, cy).pd();
    if (fill) pen.oo(r); else pen.o(r);
}

// 椭圆：先画一圈深色当轮廓，再画里面浅色的
void oval(double cx, double cy, double rx, double ry, int r, int g, int b) {
    pen.pu().moveTo(cx, cy).pd().c(0).ee(rx + 4, ry + 4);
    col(r, g, b); pen.ee(rx, ry);
}

// 多边形（绝对坐标点列），先描边再填
void shape(double *xy, int n, int r, int g, int b) {
    pen.pu().polXY();                        // 不带参数 = 清空点列
    for (int i = 0; i < n; ++i) pen.polXY(xy[2 * i], xy[2 * i + 1]);
    pen.c(0).size(9).pol(0);
    col(r, g, b); pen.size(4).pol(1);
}

// 翅膀：靠身子那截粗，往爪子那头收细
void wing(double x0, double y0, double x1, double y1, double x2, double y2,
          int r, int g, int b) {
    col(r / 2, g / 2, b / 2);
    seg(x0, y0, x1, y1, 21); seg(x1, y1, x2, y2, 13);
    col(r, g, b);
    seg(x0, y0, x1, y1, 15); seg(x1, y1, x2, y2, 8);
}

// 轮子：外圈 + 10 根辐条，辐条跟着曲柄角转
void wheel(double cx, double cy, double r, double ang) {
    col(45, 45, 50); circ(cx, cy, r, false);
    col(175, 180, 185);
    for (int i = 0; i < 10; i++) {
        double a = (ang + i * 36.0) * GOC_D2R;
        seg(cx, cy, cx + r * sin(a), cy + r * cos(a), 2);
    }
    col(45, 45, 50); circ(cx, cy, 7, true);
}

// 两条腿：髋 -> 膝 -> 脚，脚固定在脚踏上，膝盖用两骨节反解算出来
void leg(double hx, double hy, double fx, double fy, double l1, double l2, double w) {
    double dx = fx - hx, dy = fy - hy;
    double d = sqrt(dx * dx + dy * dy);
    double maxd = (l1 + l2) * 0.999;
    if (d > maxd) {                          // 腿不够长就把脚往回拽
        fx = hx + dx / d * maxd; fy = hy + dy / d * maxd;
        dx = fx - hx; dy = fy - hy; d = sqrt(dx * dx + dy * dy);
    }
    if (d < 1e-6) return;
    double ux = dx / d, uy = dy / d;
    double a = (d * d + l1 * l1 - l2 * l2) / (2 * d);   // 髋到膝那一段有多长
    double h = l1 * l1 - a * a;
    h = h > 0 ? sqrt(h) : 0;                            // 膝盖往外拐多少
    double k1x = hx + a * ux - h * uy, k1y = hy + a * uy + h * ux;
    double k2x = hx + a * ux + h * uy, k2y = hy + a * uy - h * ux;
    double kx = (k1x > k2x) ? k1x : k2x;      // 膝盖朝前（+x）的那一个
    double ky = (k1x > k2x) ? k1y : k2y;
    seg(hx, hy, kx, ky, w);
    seg(kx, ky, fx, fy, w);
}

// 描边一圈再填中间：远看是条腿，近看有轮廓
void legOutlined(double hx, double hy, double fx, double fy,
                 double l1, double l2, int r, int g, int b) {
    col(r / 2, g / 2, b / 2); leg(hx, hy, fx, fy, l1, l2, 15);
    col(r, g, b);         leg(hx, hy, fx, fy, l1, l2, 10);
}

// 蹼足：脚掌三个尖，钉在脚踏上
void webFoot(double x, double y, double dir) {
    double a = (dir + 90) * GOC_D2R, b = (dir - 90) * GOC_D2R;
    double pts[6] = {x + 16 * sin(a), y + 16 * cos(a),
                     x, y,
                     x + 16 * sin(b), y + 16 * cos(b)};
    pen.pu().polXY();
    for (int i = 0; i < 3; ++i) pen.polXY(pts[2 * i], pts[2 * i + 1]);
    pen.c(0).size(7).pol(0);
    col(235, 140, 50); pen.size(4).pol(1);
}

int main() {
    pen.speed(10).size(6);                   // speed 10：一笔画完，不排队
    double th = 0;                           // 曲柄角（度）

    for (int f = 0; f < 60; f++) {
        pen.cls();                           // 每帧擦掉重画一遍

        // 地面：一条地线 + 往前跑的路标
        col(88, 150, 96); seg(-400, GY, 400, GY, 4);
        col(150, 196, 150);
        for (int i = 0; i < 16; i++) {
            double x = -420 + fmod(i * 56.0 + f * 9.0, 896.0);
            seg(x, GY + 5, x + 28, GY + 5, 4);
        }

        double bob = 5 * sin(2 * th * GOC_D2R);        // 身体随踩踏微微起伏
        double p1x = CX + CR * sin(th * GOC_D2R), p1y = CY + CR * cos(th * GOC_D2R);
        double p2x = CX + CR * sin(th * GOC_D2R + PI), p2y = CY + CR * cos(th * GOC_D2R + PI);
        double hipx = -80, hipy = -52 + bob;           // 屁股（坐在车座上）
        double bodyx = -56, bodyy = -44 + bob;         // 身子
        double headx = 10, heady = 26 + bob;            // 脑袋
        double dir1 = atan2_deg(p1x - hipx, p1y - hipy);
        double dir2 = atan2_deg(p2x - hipx, p2y - hipy);

        // 远侧那条腿和那只翅膀，先画（被身子挡掉一半）
        legOutlined(hipx, hipy, p2x, p2y, 78, 76, 200, 112, 40);
        webFoot(p2x, p2y, dir2);
        wing(-44, -28, 30, -24, 88, -27, 50, 50, 56);

        // 车架：钢蓝色，免得和橙色的腿、黑翅膀混在一起
        col(72, 92, 124);
        seg(RX, WY, CX, CY, 7); seg(RX, WY, SX, SY, 7); seg(SX, SY, CX, CY, 7);
        seg(SX, SY, HX, HY, 7); seg(CX, CY, HX, HY, 7);
        seg(CX, CY, FY, WY, 7); seg(HX, HY, FY, WY, 7);
        col(40, 42, 46); seg(-106, -46, -72, -48, 9);        // 车座
        seg(HX, HY, 100, -24, 7); seg(78, -26, 120, -30, 7); // 车把

        // 车轮 + 曲柄
        wheel(RX, WY, WR, th * 2);
        wheel(FY, WY, WR, th * 2);
        col(70, 70, 76); circ(CX, CY, 13, false);
        seg(CX, CY, p1x, p1y, 5);
        col(200, 200, 205); circ(p1x, p1y, 6, true); circ(p2x, p2y, 6, true);

        // 近侧那条腿，压在车架前面
        legOutlined(hipx, hipy, p1x, p1y, 78, 76, 235, 140, 50);
        webFoot(p1x, p1y, dir1);

        // 身子：白羽 + 一片收着的黑翅膀 + 尾巴
        oval(bodyx, bodyy, 46, 32, 250, 250, 246);
        oval(bodyx - 12, bodyy - 4, 32, 21, 46, 46, 52);
        double tail[6] = {-98, -32, -142, -46, -132, -14};
        shape(tail, 3, 46, 46, 52);

        // 脖子：粗粗一节，先描边再填白
        pen.c(0); seg(-26, -18, -6, 0, 32); seg(-6, 0, headx - 4, heady - 4, 28);
        col(250, 250, 246);
        seg(-26, -18, -6, 0, 26); seg(-6, 0, headx - 4, heady - 4, 22);

        // 脑袋
        oval(headx, heady, 24, 20, 250, 250, 246);

        // 大嘴：下面鼓鼓的喉囊，上面长长的一截
        double pouch[10] = {32, 20, 86, 12, 76, -14, 50, -26, 30, -6};
        shape(pouch, 5, 244, 186, 74);
        double beak[6] = {32, 30, 94, 20, 34, 20};
        shape(beak, 3, 250, 196, 88);
        pen.c(0); circ(headx + 5, heady + 7, 4.5, true);       // 眼睛

        // 近侧那只翅膀，搭在车把上
        wing(-46, -34, 46, -30, 108, -29, 70, 70, 78);

        pen.pu().moveTo(-352, 320);
        pen.text("鹈鹕", 1, 34);

        wait(0.05);                           // 一帧 50 毫秒
        th += 12;                              // 每帧 12 度，一圈 30 帧
    }
    printf("蹬了 60 帧，曲柄转了 %d 度。\\n", 60 * 12);
    return 0;
}
`,
  },
  '冒泡排序：柱状图逐步比较': {
    group: 'GoC 可视化·排序',
    stdin: '',
    code: `// 冒泡排序的柱状图版（局部重绘）：静态背景只画一次，之后每帧只擦掉
// 「值或颜色变了」的那几根柱子的槽位再重画，不整屏 cls。
// 每次比较把两根柱子标黄，交换之后也标黄，已经排好位的那几根标绿。
#include <goc.h>
#include <cstdio>

const int N = 12;
int a[N] = {42, 17, 93, 8, 55, 31, 76, 24, 60, 3, 89, 41};
int lastVal[N], lastCol[N];

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

const double BASE = -280, W = 44, GAP = 12;
double X0 = -((N * (W + GAP)) - GAP) / 2;
double colX(int i) { return X0 + i * (W + GAP); }

// 只重画第 i 根柱子：先擦掉它的槽位（不碰下面的地平线），再画柱+数字
void drawBar(int i, int col) {
    double x = colX(i) + W / 2;
    pen.setAngle(0);                                          // 局部重绘不 cls，角度需要自己归零
    pen.pu().moveTo(x, BASE + 165).pd().clsRec(W + 8, 334);   // 槽位：BASE-2 .. BASE+332
    double h = a[i] / 100.0 * 300.0;
    pen.pu().moveTo(x, BASE + h / 2).pd().c(col).size(3).rr(W, h);   // rr 以笔尖为中心，笔尖放半高才是底对齐
    pen.pu().moveTo(x, BASE + h + 14).pd().c(0).text(a[i], 0, 16);
    lastVal[i] = a[i]; lastCol[i] = col;
}

// 每帧只刷新「值或颜色变了」的柱子
void refresh(int hi, int hj, int sortedFrom) {
    for (int i = 0; i < N; i++) {
        int col = 2;
        if (i == hi || i == hj) col = 5;
        else if (i >= sortedFrom) col = 3;
        if (a[i] != lastVal[i] || col != lastCol[i]) drawBar(i, col);
    }
}

int main() {
    pen.speed(10);
    for (int i = 0; i < N; i++) { lastVal[i] = -1; lastCol[i] = -1; }
    // 静态背景只画一次：地平线放在柱底下方，标题在动态区外
    seg(X0 - 20, BASE - 4, X0 + N * (W + GAP) + 20, BASE - 4, 3);
    pen.pu().moveTo(-350, 330).pd().c(0).text("冒泡排序", 0, 26);
    refresh(-1, -1, N);
    wait(0.4);
    for (int i = 0; i < N - 1; i++) {
        for (int j = 0; j < N - 1 - i; j++) {
            refresh(j, j + 1, N - 1 - i);
            wait(0.08);
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                refresh(j, j + 1, N - 1 - i);
                wait(0.08);
            }
        }
    }
    refresh(-1, -1, 0);
    printf("排好了：");
    for (int i = 0; i < N; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}
`,
  },
  '三种排序对比：三排柱子并排跑': {
    group: 'GoC 可视化·排序',
    stdin: '',
    code: `// 三种排序并排跑（局部重绘）：三个组名只画一次，标题换文字时才擦重写；
// 每帧只擦「值/颜色/数值标签变了」的那几根柱子的槽位再重画，比较次数只在
// 数字变化时重写，不整屏 cls。插入、冒泡、快排各拿一份数组副本，
// 每帧把三个算法「当前在比的两个下标」各自标黄（刚换过位置的标红）。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 10;
const int RAW[N] = {9, 7, 5, 3, 1, 8, 6, 4, 2, 0};

const int MAXF = 240;
struct Frame { int v[N]; int p, q, mark; };     // mark: 1=正在比, 2=刚换过
Frame tr[3][MAXF];
int nfr[3];

void push(int alg, const int* a, int p, int q, int mark) {
    if (nfr[alg] >= MAXF) return;
    int k = nfr[alg];
    for (int i = 0; i < N; i++) tr[alg][k].v[i] = a[i];
    tr[alg][k].p = p;
    tr[alg][k].q = q;
    tr[alg][k].mark = mark;
    nfr[alg]++;
}

// 把每个算法跑一遍，记下每一帧的数组和「正在比的那两个下标」
void trInsertion() {
    int a[N];
    memcpy(a, RAW, sizeof(a));
    for (int i = 1; i < N; i++) {
        int x = a[i], j = i - 1;
        while (j >= 0) {
            push(0, a, j, j + 1, 1);            // 在比 a[j] 和手里捏着的 x
            if (a[j] <= x) break;
            a[j + 1] = a[j];                   // 后移一位
            push(0, a, j, j + 1, 2);
            j--;
        }
        a[j + 1] = x;                          // x 落位
        push(0, a, j + 1, j + 1, 2);
    }
}

void trBubble() {
    int a[N];
    memcpy(a, RAW, sizeof(a));
    for (int i = 0; i < N - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < N - 1 - i; j++) {
            push(1, a, j, j + 1, 1);
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                push(1, a, j, j + 1, 2);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}

int partition2(int a[], int l, int r) {
    int x = a[r], i = l;
    for (int j = l; j < r; j++) {
        push(2, a, j, r, 1);                   // 拿 a[j] 和最右边的基准比
        if (a[j] <= x) {
            int t = a[i]; a[i] = a[j]; a[j] = t;
            if (i != j) push(2, a, i, j, 2);
            i++;
        }
    }
    int t = a[i]; a[i] = a[r]; a[r] = t;
    if (i != r) push(2, a, i, r, 2);           // 基准落位
    return i;
}

void trQuick(int a[], int l, int r) {
    if (l >= r) return;
    int p = partition2(a, l, r);
    trQuick(a, l, p - 1);
    trQuick(a, p + 1, r);
}

int cmpCount(int alg, int fi) {
    int c = 0;
    for (int i = 0; i <= fi; i++) if (tr[alg][i].mark == 1) c++;
    return c;
}

void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

const double BW = 16, BGAP = 5, BASE = -270, BSC = 22;
const double CX[3] = {-230, 0, 230};
double colX(int g, int i) { return CX[g] - 102.5 + i * (BW + BGAP) + BW / 2; }

int lastVal[3][N], lastCol[3][N], lastLbl[3][N];
int lastCmp[3], lastTitle = -1;

int barCol(int g, int fi, bool done, int i) {
    Frame* f = &tr[g][fi];
    if (done) return 3;                                        // 绿：排好了
    if (i == f->p || i == f->q) return (f->mark == 2) ? 1 : 5;
    return 2;
}
int barLbl(int g, int fi, bool done, int i) {
    Frame* f = &tr[g][fi];
    return (!done && (i == f->p || i == f->q)) ? 1 : 0;         // 只给正在比的两个数标数值
}

// 只重画一根柱子：擦掉它的槽位（柱身 + 顶部数字，不碰下面的组名和计数），再画
void drawBar(int g, int i, int fi, bool done) {
    Frame* f = &tr[g][fi];
    double x = colX(g, i);
    double h = f->v[i] * BSC;
    int col = barCol(g, fi, done, i);
    int lbl = barLbl(g, fi, done, i);
    pen.setAngle(0);                                           // 不 cls，角度自己归零
    pen.pu().moveTo(x, BASE + 114).pd().clsRec(BW + 4, 232);   // 槽位 BASE-2 .. BASE+230
    pen.pu().moveTo(x, BASE + h / 2).pd().c(col).size(2).rr(BW, h);   // 底对齐：笔尖放半高
    if (lbl) {
        char b[16];
        sprintf(b, "%d", f->v[i]);
        pen.pu().moveTo(x, BASE + h + 16).pd().c(0).text(b, 0, 14);
    }
    lastVal[g][i] = f->v[i]; lastCol[g][i] = col; lastLbl[g][i] = lbl;
}

void drawCmp(int g, int c) {
    if (c == lastCmp[g]) return;
    pen.setAngle(0);
    pen.pu().moveTo(CX[g], -352).pd().clsRec(150, 26);         // 不碰上面 -320 的组名
    char b[32];
    sprintf(b, "比较 %d 次", c);
    txt(CX[g], -352, b, 8, 15);
    lastCmp[g] = c;
}

void drawTitle(int which) {
    if (which == lastTitle) return;
    pen.setAngle(0);
    pen.pu().moveTo(0, 330).pd().clsRec(780, 36);
    txtL(-370, 330, which ? "三种排序对比：结果并排"
                          : "三种排序对比：同一份数据，三排柱子并排跑", 0, 24);
    lastTitle = which;
}

// 每帧只刷新「值/颜色/标签变了」的柱子和变了的计数
void refresh(int f, bool forceDone) {
    for (int g = 0; g < 3; g++) {
        int fi = (f < nfr[g]) ? f : nfr[g] - 1;
        bool done = forceDone || (f >= nfr[g]);
        for (int i = 0; i < N; i++) {
            int col = barCol(g, fi, done, i);
            int lbl = barLbl(g, fi, done, i);
            if (tr[g][fi].v[i] != lastVal[g][i] || col != lastCol[g][i] || lbl != lastLbl[g][i])
                drawBar(g, i, fi, done);
        }
        drawCmp(g, cmpCount(g, fi));
    }
}

int main() {
    pen.speed(10);
    trInsertion();
    trBubble();
    int a[N];
    memcpy(a, RAW, sizeof(a));
    trQuick(a, 0, N - 1);

    const char* nm[3] = {"插入排序", "冒泡排序", "快速排序"};
    int total = nfr[0];
    if (nfr[1] > total) total = nfr[1];
    if (nfr[2] > total) total = nfr[2];

    for (int g = 0; g < 3; g++) {
        lastCmp[g] = -1;
        for (int i = 0; i < N; i++) { lastVal[g][i] = -1; lastCol[g][i] = -1; lastLbl[g][i] = -1; }
    }
    // 静态背景只画一次：三个组名放在柱底下方，离动态槽位远远的；柱底各垫一条基准线
    for (int g = 0; g < 3; g++) txt(CX[g], -320, nm[g], 0, 20);
    for (int g = 0; g < 3; g++) seg(CX[g] - 110, BASE - 6, CX[g] + 110, BASE - 6, 2);
    drawTitle(0);

    for (int f = 0; f < total; f++) {
        refresh(f, false);
        wait(0.05);
    }

    drawTitle(1);
    refresh(total, true);
    wait(0.9);

    printf("同一份数据：插入比较 %d 次、冒泡比较 %d 次、快排比较 %d 次，结果完全一样\\n",
           cmpCount(0, nfr[0] - 1), cmpCount(1, nfr[1] - 1), cmpCount(2, nfr[2] - 1));
    return 0;
}
`,
  },
  '归并排序：分治与合并': {
    group: 'GoC 可视化·排序',
    stdin: '',
    code: `// 归并排序（局部重绘）：上面是递归的分治树（每层一个框，框里是这一段），
// 下面一行是数组当前的样子。标题、「数组」标签和底部说明只画一次；树框、数组格、
// 中转格和几行会变的文字各记上次状态，每帧只擦变了的槽位再重画，被擦到的邻居
// 按 z 序补画（深度 4 的树框和数组格有重叠），不整屏 cls。
// 合并的时候左右两段各自有序，往中转数组里归到一起；右半的元素先出来，
// 左半剩下的都比它大，于是顺手把逆序对数量数出来。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 10;
int a[N] = {5, 3, 8, 1, 9, 2, 7, 4, 6, 0};
int tmp[N];

const int MAXNODE = 40;
struct Node { int l, r, depth, m, state; };   // state: 0=刚开出来 1=单点 2=已合并
Node nodes[MAXNODE];
int nnode;

long long inv = 0;
int inMerge = 0, curL = 0, curM = 0, curR = 0, curI = 0, curJ = 0, curK = 0, lastK = -1;

const double CW = 60;                        // 一格 60 像素，10 格正好 600
double X(int i) { return -270 + CW * i; }

void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void num(double x, double y, int v, int col, int size) {
    char b[16];
    sprintf(b, "%d", v);
    pen.pu().moveTo(x, y).pd().c(col).text(b, col, size);
}

// ---- 局部重绘小框架：脏槽位擦除 + 与擦除区相交的元素按 z 序补画 ----
// 槽位（也就是 z 序）：0..39 分治树框，40..49 数组格，50..59 中转格，
// 60 中转标签，61/62 左右半标签，63 逆序对，64 合并区间
const int NS = 65;
long long sKey[NS], sLast[NS];
double sX[NS], sY[NS], sW[NS], sH[NS];
double sOX[NS], sOY[NS], sOW[NS], sOH[NS];
bool sHas[NS];
double eX[2 * NS + 8], eY[2 * NS + 8], eW[2 * NS + 8], eH[2 * NS + 8];
int eN = 0;

void setRect(int id, double x, double y, double w, double h) {
    sX[id] = x; sY[id] = y; sW[id] = w; sH[id] = h;
}
void erAdd(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0 || eN >= 2 * NS + 8) return;
    eX[eN] = x; eY[eN] = y; eW[eN] = w; eH[eN] = h; eN++;
}
bool erHit(double x, double y, double w, double h) {
    for (int k = 0; k < eN; k++)
        if (x - w / 2 < eX[k] + eW[k] / 2 && x + w / 2 > eX[k] - eW[k] / 2 &&
            y - h / 2 < eY[k] + eH[k] / 2 && y + h / 2 > eY[k] - eH[k] / 2) return true;
    return false;
}
void erErase(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0) return;
    pen.setAngle(0);                                       // clsRec 跟着笔朝向转，先归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    erAdd(x, y, w, h);
}

long long slotKey(int id) {
    if (id < MAXNODE) {
        if (id >= nnode) return -1;
        Node* nd = &nodes[id];
        long long k = nd->state + 1;
        if (nd->state >= 1) for (int i = nd->l; i < nd->r; i++) k = k * 11 + a[i];
        return k;
    }
    if (id < 50) {
        int i = id - 40, col = 2;
        if (inMerge) { if (i == curI) col = 5; else if (i == curJ) col = 3; }
        return a[i] * 8 + col;
    }
    if (id < 60) {
        int i = id - 50;
        if (!inMerge || i < curL || i >= curR) return -1;
        bool got = (i < curK);
        int col = got ? ((i == lastK) ? 13 : 4) : 8;
        return 1 + (got ? 1 : 0) + col * 2 + (got ? (tmp[i] + 1) * 32 : 0);
    }
    if (id == 60) return inMerge ? 0 : -1;
    if (id == 61) return inMerge ? curL * 100 + curM : -1;
    if (id == 62) return inMerge ? curM * 100 + curR : -1;
    if (id == 63) return inv;
    return inMerge ? curL * 100 + curR : -1;
}

void slotRect(int id) {
    if (id < MAXNODE) {
        if (id >= nnode) { setRect(id, 0, 0, 0, 0); return; }
        Node* nd = &nodes[id];
        double x1 = X(nd->l) - CW / 2, x2 = X(nd->r) - CW / 2;
        setRect(id, (x1 + x2) / 2, 280 - 62 * nd->depth, (x2 - x1) + 6, 50);
    } else if (id < 50) {
        setRect(id, X(id - 40), 10, 58, 46);
    } else if (id < 60) {
        setRect(id, X(id - 50), -70, 58, 46);
    } else if (id == 60) {
        setRect(id, -352, -70, 40, 22);
    } else if (id == 61) {
        setRect(id, (X(curL) + X(curM - 1)) / 2, 52, 130, 22);
    } else if (id == 62) {
        setRect(id, (X(curM) + X(curR - 1)) / 2, 52, 130, 22);
    } else if (id == 63) {
        setRect(id, 0, -145, 340, 32);
    } else {
        setRect(id, 0, -230, 340, 26);
    }
}

void slotPaint(int id) {
    if (id < MAXNODE) {
        Node* nd = &nodes[id];
        double y = 280 - 62 * nd->depth;
        double x1 = X(nd->l) - CW / 2, x2 = X(nd->r) - CW / 2;
        double cx = (x1 + x2) / 2, w = x2 - x1;
        int col = (nd->state == 0) ? 8 : 3;
        pen.pu().moveTo(cx, y).pd().c(col).size(2).r(w, 44);
        if (nd->state >= 1) {
            for (int i = nd->l; i < nd->r; i++) num(X(i), y, a[i], 0, 15);
        } else {
            char b[24];
            sprintf(b, "[%d,%d)", nd->l, nd->r);
            txt(cx, y, b, 8, 14);
        }
    } else if (id < 50) {
        int i = id - 40, col = 2;
        if (inMerge) { if (i == curI) col = 5; else if (i == curJ) col = 3; }
        double x = X(i);
        pen.pu().moveTo(x, 10).pd().c(col).size(2).rr(CW - 6, 40);
        num(x, 10, a[i], 0, 18);
    } else if (id < 60) {
        int i = id - 50;
        bool got = (i < curK);
        int col = got ? ((i == lastK) ? 13 : 4) : 8;
        double x = X(i);
        pen.pu().moveTo(x, -70).pd().c(col).size(2).rr(CW - 6, 40);
        if (got) num(x, -70, tmp[i], 0, 18);
    } else if (id == 60) {
        txt(-352, -70, "中转", 0, 14);
    } else if (id == 61 || id == 62) {
        char b[32];
        if (id == 61) {
            sprintf(b, "左半 [%d,%d)", curL, curM);
            txt((X(curL) + X(curM - 1)) / 2, 52, b, 5, 15);
        } else {
            sprintf(b, "右半 [%d,%d)", curM, curR);
            txt((X(curM) + X(curR - 1)) / 2, 52, b, 3, 15);
        }
    } else if (id == 63) {
        char b[40];
        sprintf(b, "逆序对 = %lld 个", inv);
        txt(0, -145, b, 1, 22);
    } else {
        char b[40];
        sprintf(b, "正在合并区间 [%d,%d)", curL, curR);
        txt(0, -230, b, 8, 16);
    }
}

void redraw() {
    for (int id = 0; id < NS; id++) { sKey[id] = slotKey(id); slotRect(id); }
    eN = 0;
    for (int id = 0; id < NS; id++) {                      // 只擦状态变了的槽位
        if (sKey[id] == sLast[id]) continue;
        if (sKey[id] < 0) {                                // 这一格空了：擦掉上次画的那块
            if (sHas[id]) erErase(sOX[id], sOY[id], sOW[id], sOH[id]);
        } else if (sHas[id]) {                             // 会挪位置的：新旧两块一起擦
            double x1 = sX[id] - sW[id] / 2, x2 = sX[id] + sW[id] / 2;
            double y1 = sY[id] - sH[id] / 2, y2 = sY[id] + sH[id] / 2;
            if (sOX[id] - sOW[id] / 2 < x1) x1 = sOX[id] - sOW[id] / 2;
            if (sOX[id] + sOW[id] / 2 > x2) x2 = sOX[id] + sOW[id] / 2;
            if (sOY[id] - sOH[id] / 2 < y1) y1 = sOY[id] - sOH[id] / 2;
            if (sOY[id] + sOH[id] / 2 > y2) y2 = sOY[id] + sOH[id] / 2;
            erErase((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
        } else {
            erErase(sX[id], sY[id], sW[id], sH[id]);
        }
    }
    for (int id = 0; id < NS; id++) {                      // 按 z 序补画被擦到的邻居
        if (sKey[id] >= 0 &&
            (sKey[id] != sLast[id] || erHit(sX[id], sY[id], sW[id], sH[id]))) {
            pen.setAngle(0);
            slotPaint(id);
            erAdd(sX[id], sY[id], sW[id], sH[id]);
        }
        sLast[id] = sKey[id];
        sOX[id] = sX[id]; sOY[id] = sY[id]; sOW[id] = sW[id]; sOH[id] = sH[id];
        sHas[id] = (sKey[id] >= 0);
    }
}
void redrawReset() {
    for (int id = 0; id < NS; id++) { sLast[id] = -2; sHas[id] = false; }
}

void msort(int l, int r, int depth) {
    int id = nnode++;
    nodes[id].l = l;
    nodes[id].r = r;
    nodes[id].depth = depth;
    nodes[id].m = (r - l > 1) ? (l + r) / 2 : -1;
    nodes[id].state = 0;
    redraw();                                 // 这一刀切下去，新开一个区间
    wait(0.05);
    if (r - l <= 1) {
        nodes[id].state = 1;
        redraw();
        wait(0.04);
        return;
    }
    int m = (l + r) / 2;
    nodes[id].m = m;
    msort(l, m, depth + 1);
    msort(m, r, depth + 1);

    int i = l, j = m, k = l;
    inMerge = 1;
    curL = l; curM = m; curR = r; lastK = -1;
    while (i < m && j < r) {
        curI = i; curJ = j; curK = k;
        redraw();                             // 这一步在比 a[i] 和 a[j]
        wait(0.05);
        if (a[i] <= a[j]) { tmp[k] = a[i]; i++; }
        else { tmp[k] = a[j]; j++; inv += m - i; }
        k++;
        lastK = k - 1;
        curK = k;
    }
    while (i < m) {
        tmp[k] = a[i]; i++; k++; lastK = k - 1;
        curI = i - 1; curJ = j; curK = k;
        redraw();
        wait(0.035);
    }
    while (j < r) {
        tmp[k] = a[j]; j++; k++; lastK = k - 1;
        curI = i; curJ = j - 1; curK = k;
        redraw();
        wait(0.035);
    }
    for (int t = l; t < r; t++) a[t] = tmp[t];
    nodes[id].state = 2;
    inMerge = 0;
    redraw();                                 // 这一段合好了
    wait(0.08);
}

int main() {
    pen.speed(10);
    // 静态背景只画一次：标题、「数组」标签、底部说明，全在动态槽位之外
    txtL(-370, 330, "归并排序：分治与合并", 0, 24);
    txt(-352, 10, "数组", 0, 14);
    txt(0, -190, "右半的元素先出来时，左半剩下 m-i 个都比它大，于是多出 m-i 个逆序对", 0, 15);
    redrawReset();
    msort(0, N, 0);
    wait(0.9);
    printf("排序后：");
    for (int i = 0; i < N; i++) printf("%d ", a[i]);
    printf("  逆序对总数 = %lld\\n", inv);
    return 0;
}
`,
  },
  '选择排序与希尔排序：两种打法': {
    group: 'GoC 可视化·排序',
    stdin: '',
    code: `// 上半屏是选择排序：每趟把「含最小值的那一段」整段标黄，
// 挑出最小的那根标红，正在看的那根标金。
// 下半屏是希尔排序：同一 gap 的柱子同色，一次后移画成一根跳过好几格的箭头。
// 局部重绘：标题、上半屏说明和中间那条分隔线只画一次；每根柱子各记上次状态，
// 每帧只擦变了的槽位；跨好几格的箭头单独一个槽位，擦到谁就按 z 序补画谁，不整屏 cls。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 10;
int A[N] = {9, 5, 1, 8, 3, 7, 2, 6, 4, 0};
int B[N];

const double BASE1 = 40, BASE2 = -300, SC = 14, BW = 26, GAPX = 36;
double bx(int i) { return -175 + i * GAPX; }

int phase = 0;
int selI = 0, selM = -1, selJ = -1;
int shGap = 5, shMove = -1, shPrev = -1, shCur = -1;

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void arrowH(double x1, double x2, double y, int col) {
    double s = (x2 >= x1) ? 1.0 : -1.0;
    double L = 14;
    pen.c(col);
    seg(x1, y, x2, y, 3);
    seg(x2, y, x2 - s * L * 0.9, y + L * 0.45, 3);
    seg(x2, y, x2 - s * L * 0.9, y - L * 0.45, 3);
}
void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void num(double x, double y, int v, int col, int size) {
    char b[16];
    sprintf(b, "%d", v);
    pen.pu().moveTo(x, y).pd().c(col).text(b, col, size);
}

// ---- 局部重绘小框架：脏槽位擦除 + 与擦除区相交的元素按 z 序补画 ----
// 槽位（z 序）：0..9 上半屏柱子，10 下半屏说明，11..20 下半屏柱子，21 跳跃箭头
const int NS = 22;
long long sKey[NS], sLast[NS];
double sX[NS], sY[NS], sW[NS], sH[NS];
double sOX[NS], sOY[NS], sOW[NS], sOH[NS];
bool sHas[NS];
double eX[2 * NS + 8], eY[2 * NS + 8], eW[2 * NS + 8], eH[2 * NS + 8];
int eN = 0;

void setRect(int id, double x, double y, double w, double h) {
    sX[id] = x; sY[id] = y; sW[id] = w; sH[id] = h;
}
void erAdd(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0 || eN >= 2 * NS + 8) return;
    eX[eN] = x; eY[eN] = y; eW[eN] = w; eH[eN] = h; eN++;
}
bool erHit(double x, double y, double w, double h) {
    for (int k = 0; k < eN; k++)
        if (x - w / 2 < eX[k] + eW[k] / 2 && x + w / 2 > eX[k] - eW[k] / 2 &&
            y - h / 2 < eY[k] + eH[k] / 2 && y + h / 2 > eY[k] - eH[k] / 2) return true;
    return false;
}
void erErase(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0) return;
    pen.setAngle(0);                                       // clsRec/rr 都跟朝向转，先归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    erAdd(x, y, w, h);
}

bool arrowOn() { return phase == 1 && shPrev >= 0 && shCur >= 0; }
double arrowY() {
    double h1 = B[shPrev] * SC + 6, h2 = B[shCur] * SC + 6;
    return BASE2 + (h1 > h2 ? h1 : h2) + 26;
}

long long slotKey(int id) {
    if (id < 10) {
        int col = 2;
        bool filled = true;
        if (phase == 1) col = 3;              // 排完了，整排标绿
        else if (id < selI) col = 3;          // 已经排好的前缀
        else if (id == selJ) col = 13;        // 正在看的那一根
        else if (id == selM) col = 1;         // 当前最小的那个
        else { col = 5; filled = false; }     // 本轮要挑最小的那一段
        return A[id] + 16 * col + 256 * (filled ? 1 : 0);
    }
    if (id == 10) return (phase == 0) ? 0 : (1 + shGap);
    if (id < 21) {
        int i = id - 11, col = 2;
        if (phase == 1) {
            col = 1 + (i % shGap) % 5;        // 同一组的柱子同色
            if (i == shMove) col = 14;        // 手里捏着要放下的那个
        }
        int hl = (arrowOn() && (i == shPrev || i == shCur)) ? 1 : 0;
        return B[i] + 16 * col + 256 * hl;
    }
    if (!arrowOn()) return -1;
    double h1 = B[shPrev] * SC + 6, h2 = B[shCur] * SC + 6;
    return 1 + shPrev + 16 * shCur + 256 * (int)(h1 > h2 ? h1 : h2);
}

void slotRect(int id) {
    if (id < 10) {
        setRect(id, bx(id) + BW / 2, BASE1 + 75, BW + 8, 158);            // 36 .. 194
    } else if (id == 10) {
        setRect(id, -100, -110, 560, 28);
    } else if (id < 21) {
        setRect(id, bx(id - 11) + BW / 2, BASE2 + 74, BW + 8, 160);       // -306 .. -146
    } else if (arrowOn()) {
        double c1 = bx(shPrev) + BW / 2, c2 = bx(shCur) + BW / 2;
        double dx = (c2 > c1) ? (c2 - c1) : (c1 - c2);
        setRect(id, (c1 + c2) / 2, arrowY(), dx + 12, 22);
    } else {
        setRect(id, 0, 0, 0, 0);
    }
}

void slotPaint(int id) {
    if (id < 10) {
        double c = bx(id) + BW / 2;
        double h = A[id] * SC + 6;
        int col = 2;
        bool filled = true;
        if (phase == 1) col = 3;
        else if (id < selI) col = 3;
        else if (id == selJ) col = 13;
        else if (id == selM) col = 1;
        else { col = 5; filled = false; }
        pen.pu().moveTo(c, BASE1 + h / 2).pd().c(col).size(2);            // 底对齐：笔尖放半高
        if (filled) pen.rr(BW, h); else pen.r(BW, h);
        num(c, BASE1 + h + 12, A[id], 0, 14);
    } else if (id == 10) {
        if (phase == 0) txtL(-370, -110, "下半屏：希尔排序 —— 等上面跑完再开始", 0, 18);
        else {
            char b[64];
            sprintf(b, "下半屏：希尔排序 —— gap = %d，同一组相隔 %d 个位置", shGap, shGap);
            txtL(-370, -110, b, 0, 18);
        }
    } else if (id < 21) {
        int i = id - 11;
        double c = bx(i) + BW / 2;
        double h = B[i] * SC + 6;
        int col = 2;
        if (phase == 1) {
            col = 1 + (i % shGap) % 5;
            if (i == shMove) col = 14;
        }
        pen.pu().moveTo(c, BASE2 + h / 2).pd().c(col).size(2).rr(BW, h);
        num(c, BASE2 + h + 12, B[i], 0, 14);
        if (arrowOn() && (i == shPrev || i == shCur))
            pen.pu().moveTo(c, BASE2 + h / 2).pd().c(5).size(3).r(BW + 4, h + 4);
    } else if (arrowOn()) {
        arrowH(bx(shPrev) + BW / 2, bx(shCur) + BW / 2, arrowY(), 5);
    }
}

void seg(double x1, double y1, double x2, double y2, double w);
void redraw() {
    for (int id = 0; id < NS; id++) { sKey[id] = slotKey(id); slotRect(id); }
    eN = 0;
    for (int id = 0; id < NS; id++) {                      // 只擦状态变了的槽位
        if (sKey[id] == sLast[id]) continue;
        if (sKey[id] < 0) {                                // 箭头收起来了：擦掉上次那块
            if (sHas[id]) erErase(sOX[id], sOY[id], sOW[id], sOH[id]);
        } else if (sHas[id]) {                             // 箭头会挪：新旧两块一起擦
            double x1 = sX[id] - sW[id] / 2, x2 = sX[id] + sW[id] / 2;
            double y1 = sY[id] - sH[id] / 2, y2 = sY[id] + sH[id] / 2;
            if (sOX[id] - sOW[id] / 2 < x1) x1 = sOX[id] - sOW[id] / 2;
            if (sOX[id] + sOW[id] / 2 > x2) x2 = sOX[id] + sOW[id] / 2;
            if (sOY[id] - sOH[id] / 2 < y1) y1 = sOY[id] - sOH[id] / 2;
            if (sOY[id] + sOH[id] / 2 > y2) y2 = sOY[id] + sOH[id] / 2;
            erErase((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
        } else {
            erErase(sX[id], sY[id], sW[id], sH[id]);
        }
    }
    // 两条水平基准线是静态的，但柱子槽位会擦到它们：被擦到就补画
    bool fixTop = false, fixBot = false;
    for (int k = 0; k < eN; k++) {
        double y1 = eY[k] - eH[k] / 2, y2 = eY[k] + eH[k] / 2;
        if (y1 < 40 && y2 > 40) fixTop = true;
        if (y1 < BASE2 && y2 > BASE2) fixBot = true;
    }
    if (fixTop) { pen.c(8); seg(-360, 40, 360, 40, 2); }
    if (fixBot) { pen.c(8); seg(-360, BASE2, 360, BASE2, 2); }
    for (int id = 0; id < NS; id++) {                      // 按 z 序补画被箭头擦到的柱子
        if (sKey[id] >= 0 &&
            (sKey[id] != sLast[id] || erHit(sX[id], sY[id], sW[id], sH[id]))) {
            pen.setAngle(0);
            slotPaint(id);
            erAdd(sX[id], sY[id], sW[id], sH[id]);
        }
        sLast[id] = sKey[id];
        sOX[id] = sX[id]; sOY[id] = sY[id]; sOW[id] = sW[id]; sOH[id] = sH[id];
        sHas[id] = (sKey[id] >= 0);
    }
}
void redrawReset() {
    for (int id = 0; id < NS; id++) { sLast[id] = -2; sHas[id] = false; }
}

int main() {
    pen.speed(10);
    memcpy(B, A, sizeof(A));
    int cmp = 0, swp = 0;

    // 静态背景只画一次：标题、上半屏说明、中间分隔线（都在柱子槽位之外）
    txtL(-370, 330, "选择排序与希尔排序：两种打法", 0, 24);
    txtL(-370, 300, "上半屏：选择排序 —— 每趟把含最小值的那一段标黄", 0, 18);
    pen.c(8);
    seg(-360, 40, 360, 40, 2);
    seg(-360, BASE2, 360, BASE2, 2);
    redrawReset();

    for (int i = 0; i < N - 1; i++) {         // 选择排序
        selI = i; selM = i; selJ = -1;
        for (int j = i + 1; j < N; j++) {
            selJ = j;
            cmp++;
            redraw();
            wait(0.03);
            if (A[j] < A[selM]) selM = j;
        }
        if (selM != i) {
            int t = A[i]; A[i] = A[selM]; A[selM] = t;
            swp++;
            selJ = selM; selM = i;           // 这两根刚换过位置
            redraw();
            wait(0.06);
        }
        selI = i + 1; selM = -1; selJ = -1;
    }
    redraw();
    wait(0.3);

    phase = 1;
    int scmp = 0, smv = 0;
    for (int gap = N / 2; gap > 0; gap /= 2) {   // 希尔排序
        shGap = gap; shMove = -1; shPrev = -1; shCur = -1;
        redraw();
        wait(0.2);
        for (int i = gap; i < N; i++) {
            int x = B[i], j = i;
            shMove = i;
            while (j >= gap) {
                shPrev = j - gap; shCur = j;
                scmp++;
                redraw();
                wait(0.04);
                if (B[j - gap] <= x) break;
                B[j] = B[j - gap];          // 同组内后移 gap 位
                smv++;
                j -= gap;
                shPrev = -1; shCur = -1; shMove = j;
                redraw();
                wait(0.04);
            }
            B[j] = x;
            smv++;
            shPrev = -1; shCur = -1; shMove = j;
            redraw();
            wait(0.04);
        }
    }
    redraw();
    wait(0.9);

    printf("选择排序：比较 %d 次，交换 %d 次；希尔排序：比较 %d 次，移动 %d 次\\n",
           cmp, swp, scmp, smv);
    return 0;
}
`,
  },
  '堆排序：数组版的堆': {
    group: 'GoC 可视化·排序',
    stdin: '',
    code: `// 堆排序（局部重绘）：数组画成一棵完全二叉树（下标 i 的孩子是 2i+1 / 2i+2），
// 父子之间连线。标题、说明、a[] 标签和下标数字只画一次；连线、节点圈、数组格
// 各是一个槽位，每帧只擦「值/颜色/黄红圈变了」的槽位再重画，被擦到的连线按 z 序
// 补画，不整屏 cls。建堆和下沉的时候，正在比的父子两个节点描黄圈，
// 换完位置的那一瞬描红圈。底下那行是同一个数组，顺便看清下标和树的关系。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 12;
int a[N] = {4, 10, 3, 5, 1, 8, 7, 2, 9, 6, 0, 11};

int hlA = -1, hlB = -1, hlMark = 0;     // 0=在比, 1=刚换过
int heapEnd = N;                        // 堆的有效区间 [0, heapEnd)
int cmpCnt = 0, swpCnt = 0;

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void num(double x, double y, int v, int col, int size) {
    char b[16];
    sprintf(b, "%d", v);
    pen.pu().moveTo(x, y).pd().c(col).text(b, col, size);
}

int nodeDepth(int i) {
    int d = 0, n = i + 1;
    while (n > 1) { n >>= 1; d++; }
    return d;
}
double nodeX(int i) {
    int d = nodeDepth(i);
    int k = i - ((1 << d) - 1);
    int span = 1 << (3 - d);
    double slot = k * span + span / 2.0 - 0.5;
    return (slot - 3.5) * 95.0;
}
double nodeY(int i) { return 250 - 90 * nodeDepth(i); }
double AX(int i) { return -267 + 48 * i; }

// ---- 局部重绘小框架：脏槽位擦除 + 与擦除区相交的元素按 z 序补画 ----
// 槽位（z 序）：0..10 父子连线，11..22 树节点，23..34 数组格，35 统计文字
const int NS = 36;
long long sKey[NS], sLast[NS];
double sX[NS], sY[NS], sW[NS], sH[NS];
double sOX[NS], sOY[NS], sOW[NS], sOH[NS];
bool sHas[NS];
double eX[2 * NS + 8], eY[2 * NS + 8], eW[2 * NS + 8], eH[2 * NS + 8];
int eN = 0;

void setRect(int id, double x, double y, double w, double h) {
    sX[id] = x; sY[id] = y; sW[id] = w; sH[id] = h;
}
void erAdd(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0 || eN >= 2 * NS + 8) return;
    eX[eN] = x; eY[eN] = y; eW[eN] = w; eH[eN] = h; eN++;
}
bool erHit(double x, double y, double w, double h) {
    for (int k = 0; k < eN; k++)
        if (x - w / 2 < eX[k] + eW[k] / 2 && x + w / 2 > eX[k] - eW[k] / 2 &&
            y - h / 2 < eY[k] + eH[k] / 2 && y + h / 2 > eY[k] - eH[k] / 2) return true;
    return false;
}
void erErase(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0) return;
    pen.setAngle(0);                                       // clsRec/oo 都跟朝向转，先归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    erAdd(x, y, w, h);
}

int nodeHl(int i) {
    if (i != hlA && i != hlB) return 0;
    return (hlMark == 1) ? 2 : 1;
}

long long slotKey(int id) {
    if (id < N - 1) return 0;                              // 连线永远不变，只会被补画
    if (id < 11 + N) {
        int i = id - 11;
        int col = (i >= heapEnd) ? 3 : 2;                  // 绿：已经排到末尾去了
        return a[i] + 16 * col + 256 * nodeHl(i);
    }
    if (id < 23 + N) {
        int i = id - 23;
        int col = (i >= heapEnd) ? 3 : 2;
        if (i == hlA || i == hlB) col = (hlMark == 1) ? 1 : 5;
        return a[i] + 16 * col;
    }
    return cmpCnt * 10000 + swpCnt;
}

void slotRect(int id) {
    if (id < N - 1) {
        int c = id + 1, p = (c - 1) / 2;
        double x1 = nodeX(p), y1 = nodeY(p) - 24;
        double x2 = nodeX(c), y2 = nodeY(c) + 24;
        double dx = (x2 > x1) ? (x2 - x1) : (x1 - x2);
        double dy = (y2 > y1) ? (y2 - y1) : (y1 - y2);
        setRect(id, (x1 + x2) / 2, (y1 + y2) / 2, dx + 8, dy + 8);
    } else if (id < 11 + N) {
        int i = id - 11;
        setRect(id, nodeX(i), nodeY(i), 66, 66);           // 盖住半径 28 + 线宽 4 的黄红圈
    } else if (id < 23 + N) {
        setRect(id, AX(id - 23), -150, 46, 40);            // 不碰下面 -186 的下标数字
    } else {
        setRect(id, 0, -235, 500, 28);
    }
}

void slotPaint(int id) {
    if (id < N - 1) {
        int c = id + 1, p = (c - 1) / 2;
        pen.c(8);
        seg(nodeX(p), nodeY(p) - 24, nodeX(c), nodeY(c) + 24, 2);
    } else if (id < 11 + N) {
        int i = id - 11;
        double x = nodeX(i), y = nodeY(i);
        int col = (i >= heapEnd) ? 3 : 2;
        pen.pu().moveTo(x, y).pd().c(col).size(3).oo(22);
        num(x, y, a[i], 0, 16);
        int hl = nodeHl(i);
        if (hl) pen.pu().moveTo(x, y).pd().c(hl == 2 ? 1 : 5).size(4).o(28);
    } else if (id < 23 + N) {
        int i = id - 23;
        double x = AX(i);
        int col = (i >= heapEnd) ? 3 : 2;
        if (i == hlA || i == hlB) col = (hlMark == 1) ? 1 : 5;
        pen.pu().moveTo(x, -150).pd().c(col).size(2).rr(42, 34);
        num(x, -150, a[i], 0, 16);
    } else {
        char b[64];
        sprintf(b, "比较 %d 次，交换 %d 次；时间 O(n log n)，额外空间 O(1)", cmpCnt, swpCnt);
        txt(0, -235, b, 0, 16);
    }
}

void redraw() {
    for (int id = 0; id < NS; id++) { sKey[id] = slotKey(id); slotRect(id); }
    eN = 0;
    for (int id = 0; id < NS; id++) {                      // 只擦状态变了的槽位
        if (sKey[id] == sLast[id]) continue;
        if (sKey[id] < 0) {
            if (sHas[id]) erErase(sOX[id], sOY[id], sOW[id], sOH[id]);
        } else if (sHas[id]) {
            double x1 = sX[id] - sW[id] / 2, x2 = sX[id] + sW[id] / 2;
            double y1 = sY[id] - sH[id] / 2, y2 = sY[id] + sH[id] / 2;
            if (sOX[id] - sOW[id] / 2 < x1) x1 = sOX[id] - sOW[id] / 2;
            if (sOX[id] + sOW[id] / 2 > x2) x2 = sOX[id] + sOW[id] / 2;
            if (sOY[id] - sOH[id] / 2 < y1) y1 = sOY[id] - sOH[id] / 2;
            if (sOY[id] + sOH[id] / 2 > y2) y2 = sOY[id] + sOH[id] / 2;
            erErase((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
        } else {
            erErase(sX[id], sY[id], sW[id], sH[id]);
        }
    }
    for (int id = 0; id < NS; id++) {                      // 按 z 序补画被擦到的连线/邻居
        if (sKey[id] >= 0 &&
            (sKey[id] != sLast[id] || erHit(sX[id], sY[id], sW[id], sH[id]))) {
            pen.setAngle(0);
            slotPaint(id);
            erAdd(sX[id], sY[id], sW[id], sH[id]);
        }
        sLast[id] = sKey[id];
        sOX[id] = sX[id]; sOY[id] = sY[id]; sOW[id] = sW[id]; sOH[id] = sH[id];
        sHas[id] = (sKey[id] >= 0);
    }
}
void redrawReset() {
    for (int id = 0; id < NS; id++) { sLast[id] = -2; sHas[id] = false; }
}

void siftDown(int arr[], int root, int end) {
    while (2 * root + 1 < end) {
        int child = 2 * root + 1;
        hlA = root; hlB = child; hlMark = 0;
        cmpCnt++;
        redraw();
        wait(0.035);
        if (child + 1 < end && arr[child + 1] > arr[child]) {
            child = child + 1;
            hlB = child;
            cmpCnt++;
            redraw();
            wait(0.035);
        }
        if (arr[root] >= arr[child]) { hlA = -1; hlB = -1; break; }
        int t = arr[root]; arr[root] = arr[child]; arr[child] = t;
        swpCnt++;
        hlMark = 1;
        redraw();
        wait(0.05);
        root = child;
        hlA = -1; hlB = -1;
    }
}

int main() {
    pen.speed(10);
    // 静态背景只画一次：标题、说明、a[] 标签、下标数字（都在动态槽位之外）
    txtL(-370, 280, "堆排序：数组版的堆", 0, 24);
    txtL(-370, 254, "下标 i 的孩子是 2i+1 / 2i+2", 0, 17);
    txt(-352, -150, "a[]", 0, 15);
    for (int i = 0; i < N; i++) num(AX(i), -186, i, 8, 13);
    redrawReset();
    redraw();
    wait(0.4);

    for (int i = N / 2 - 1; i >= 0; --i) {     // 自底向上建堆
        siftDown(a, i, N);
    }
    redraw();
    wait(0.5);

    for (int end = N - 1; end > 0; --end) {     // 依次把堆顶最大值换到末尾
        int t = a[0]; a[0] = a[end]; a[end] = t;
        swpCnt++;
        heapEnd = end;
        hlA = 0; hlB = end; hlMark = 1;
        redraw();
        wait(0.06);
        hlA = -1; hlB = -1;
        siftDown(a, 0, end);
    }
    heapEnd = 0;
    redraw();
    wait(0.9);

    printf("排序结果：");
    for (int i = 0; i < N; i++) printf("%d ", a[i]);
    printf("\\n比较 %d 次，交换 %d 次；时间 O(n log n)，额外空间 O(1)\\n", cmpCnt, swpCnt);
    return 0;
}
`,
  },
  '计数排序与桶排序：值域与桶': {
    group: 'GoC 可视化·排序',
    stdin: '',
    code: `// 左边是计数排序：值域 0..9，每个值数一次频次（蓝柱），
// 做完前缀和变成每个值在输出里的结束位置（绿柱），
// 再倒着把元素放进输出，柱子随之变矮——那就是桶口在往左移。
// 右边是桶排序：5 个筐，元素按 值/20 落筐，筐内再插入排序，最后按筐号输出。
// 局部重绘：标题、两行小标题、值域数字和说明只画一次；每个格子/柱子/筐内元素
// 各记上次状态，每帧只擦变了的槽位，被擦到的筐框和标签按 z 序补画，不整屏 cls。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 12;
int CA[N] = {7, 3, 9, 1, 7, 5, 2, 8, 3, 6, 4, 0};
int RA[N] = {29, 5, 71, 18, 44, 93, 36, 60, 12, 87, 51, 66};

int cnt[101];
int disp[10];
int outv[12];
bool outHas[12];
int curIn = -1, curV = -1;
int ph = 0;                                  // 0=数频次 1=前缀和 2=放输出

int bval[5][12], blen[5];
int outv2[12];
bool outHas2[12];
int curIn2 = -1, curB = -1, curBi = -1, curBj = -1;

void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void num(double x, double y, int v, int col, int size) {
    char b[16];
    sprintf(b, "%d", v);
    pen.pu().moveTo(x, y).pd().c(col).text(b, col, size);
}

// ---- 局部重绘小框架：脏槽位擦除 + 与擦除区相交的元素按 z 序补画 ----
// 槽位（z 序）：0..11 左原始格，12..21 左计数柱，22 输出标签，23..34 左输出格，
// 35..46 右原始格，47..51 筐框+筐标签，52..71 筐内元素，72..83 右输出格
const int KMAX = 4;
const int NS = 84;
long long sKey[NS], sLast[NS];
double sX[NS], sY[NS], sW[NS], sH[NS];
double sOX[NS], sOY[NS], sOW[NS], sOH[NS];
bool sHas[NS];
double eX[2 * NS + 8], eY[2 * NS + 8], eW[2 * NS + 8], eH[2 * NS + 8];
int eN = 0;

void setRect(int id, double x, double y, double w, double h) {
    sX[id] = x; sY[id] = y; sW[id] = w; sH[id] = h;
}
void erAdd(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0 || eN >= 2 * NS + 8) return;
    eX[eN] = x; eY[eN] = y; eW[eN] = w; eH[eN] = h; eN++;
}
bool erHit(double x, double y, double w, double h) {
    for (int k = 0; k < eN; k++)
        if (x - w / 2 < eX[k] + eW[k] / 2 && x + w / 2 > eX[k] - eW[k] / 2 &&
            y - h / 2 < eY[k] + eH[k] / 2 && y + h / 2 > eY[k] - eH[k] / 2) return true;
    return false;
}
void erErase(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0) return;
    pen.setAngle(0);                                       // clsRec/rr 都跟朝向转，先归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    erAdd(x, y, w, h);
}

long long slotKey(int id) {
    if (id < 12) return CA[id] * 8 + ((id == curIn) ? 5 : 2);
    if (id < 22) {
        int v = id - 12, col = (ph == 0) ? 2 : 3;
        if (v == curV) col = 5;
        return disp[v] + 16 * col + 256 * ph;
    }
    if (id == 22) return 0;                                // 「输出」标签：常量，只会被补画
    if (id < 35) {
        int i = id - 23;
        return outHas[i] ? (16 + outv[i]) : 1;
    }
    if (id < 47) {
        int i = id - 35;
        return RA[i] * 8 + ((i == curIn2) ? 5 : 2);
    }
    if (id < 52) return 0;                                 // 筐框+筐标签：常量
    if (id < 72) {
        int t = id - 52, b = t / KMAX, k = t % KMAX;
        if (k >= blen[b]) return -1;
        int col = 8;
        if (b == curB && k == curBi) col = 1;
        else if (b == curB && k == curBj) col = 13;
        return 1 + bval[b][k] + 128 * col;
    }
    int i = id - 72;
    return outHas2[i] ? (16 + outv2[i]) : 1;
}

void slotRect(int id) {
    if (id < 12) {
        setRect(id, -348 + 26 * id, 198, 25, 36);
    } else if (id < 22) {
        setRect(id, -347 + 30 * (id - 12), 62, 28, 152);   // -14 .. 138，不碰 -26 的值域数字
    } else if (id == 22) {
        setRect(id, -384, -150, 30, 20);
    } else if (id < 35) {
        setRect(id, -348 + 26 * (id - 23), -150, 25, 36);
    } else if (id < 47) {
        setRect(id, 42 + 26 * (id - 35), 198, 25, 36);
    } else if (id < 52) {
        setRect(id, 56 + 68 * (id - 47), -30, 68, 186);
    } else if (id < 72) {
        int t = id - 52, b = t / KMAX, k = t % KMAX;
        setRect(id, 56 + 68 * b, 30 - 26 * k, 26, 26);
    } else {
        setRect(id, 42 + 26 * (id - 72), -160, 25, 36);
    }
}

void slotPaint(int id) {
    if (id < 12) {                                         // 左：原始数据
        double x = -348 + 26 * id;
        int col = (id == curIn) ? 5 : 2;
        pen.pu().moveTo(x, 198).pd().c(col).size(2).rr(24, 32);
        num(x, 198, CA[id], 0, 14);
    } else if (id < 22) {                                  // 左：计数 / 前缀和
        int v = id - 12;
        double x = -347 + 30 * v, base = -10;
        double sc = (ph == 0) ? 20 : 10;
        double h = disp[v] * sc + 4;
        int col = (ph == 0) ? 2 : 3;
        if (v == curV) col = 5;
        pen.pu().moveTo(x, base + h / 2).pd().c(col).size(2).rr(26, h);   // 底对齐：笔尖放半高
        num(x, base + h + 14, disp[v], 0, 14);
    } else if (id == 22) {
        txtL(-398, -150, "输出", 0, 14);
    } else if (id < 35) {                                  // 左：输出
        int i = id - 23;
        double x = -348 + 26 * i;
        pen.pu().moveTo(x, -150).pd().c(outHas[i] ? 3 : 8).size(2).rr(24, 32);
        if (outHas[i]) num(x, -150, outv[i], 0, 14);
    } else if (id < 47) {                                  // 右：原始数据
        int i = id - 35;
        double x = 42 + 26 * i;
        int col = (i == curIn2) ? 5 : 2;
        pen.pu().moveTo(x, 198).pd().c(col).size(2).rr(24, 32);
        num(x, 198, RA[i], 0, 13);
    } else if (id < 52) {                                  // 右：五个筐的框和标签
        int b = id - 47;
        double cx = 56 + 68 * b;
        pen.pu().moveTo(cx, -30).pd().c(8).size(2).r(62, 180);
        char lb[24];
        sprintf(lb, "筐%d [%d,%d)", b, b * 20, (b + 1) * 20);
        txt(cx, 48, lb, 0, 13);
    } else if (id < 72) {                                  // 右：筐内元素
        int t = id - 52, b = t / KMAX, k = t % KMAX;
        double cx = 56 + 68 * b, y = 30 - 26 * k;
        int col = 8;
        if (b == curB && k == curBi) col = 1;
        else if (b == curB && k == curBj) col = 13;
        pen.pu().moveTo(cx, y).pd().c(col).size(2).oo(12);
        num(cx, y, bval[b][k], 0, 14);
    } else {                                               // 右：输出
        int i = id - 72;
        double x = 42 + 26 * i;
        pen.pu().moveTo(x, -160).pd().c(outHas2[i] ? 3 : 8).size(2).rr(24, 32);
        if (outHas2[i]) num(x, -160, outv2[i], 0, 13);
    }
}

void redraw() {
    for (int id = 0; id < NS; id++) { sKey[id] = slotKey(id); slotRect(id); }
    eN = 0;
    for (int id = 0; id < NS; id++) {                      // 只擦状态变了的槽位
        if (sKey[id] == sLast[id]) continue;
        if (sKey[id] < 0) {                                // 筐内这一格空了：擦掉上次那块
            if (sHas[id]) erErase(sOX[id], sOY[id], sOW[id], sOH[id]);
        } else if (sHas[id]) {
            double x1 = sX[id] - sW[id] / 2, x2 = sX[id] + sW[id] / 2;
            double y1 = sY[id] - sH[id] / 2, y2 = sY[id] + sH[id] / 2;
            if (sOX[id] - sOW[id] / 2 < x1) x1 = sOX[id] - sOW[id] / 2;
            if (sOX[id] + sOW[id] / 2 > x2) x2 = sOX[id] + sOW[id] / 2;
            if (sOY[id] - sOH[id] / 2 < y1) y1 = sOY[id] - sOH[id] / 2;
            if (sOY[id] + sOH[id] / 2 > y2) y2 = sOY[id] + sOH[id] / 2;
            erErase((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
        } else {
            erErase(sX[id], sY[id], sW[id], sH[id]);
        }
    }
    for (int id = 0; id < NS; id++) {                      // 按 z 序补画被擦到的筐框/邻居
        if (sKey[id] >= 0 &&
            (sKey[id] != sLast[id] || erHit(sX[id], sY[id], sW[id], sH[id]))) {
            pen.setAngle(0);
            slotPaint(id);
            erAdd(sX[id], sY[id], sW[id], sH[id]);
        }
        sLast[id] = sKey[id];
        sOX[id] = sX[id]; sOY[id] = sY[id]; sOW[id] = sW[id]; sOH[id] = sH[id];
        sHas[id] = (sKey[id] >= 0);
    }
}
void redrawReset() {
    for (int id = 0; id < NS; id++) { sLast[id] = -2; sHas[id] = false; }
}

int main() {
    pen.speed(10);
    memset(cnt, 0, sizeof(cnt));
    memset(disp, 0, sizeof(disp));
    memset(outHas, 0, sizeof(outHas));
    memset(blen, 0, sizeof(blen));
    memset(outHas2, 0, sizeof(outHas2));

    // 静态背景只画一次：标题、两行小标题、值域数字、说明（都在动态槽位之外）
    txtL(-370, 236, "计数排序与桶排序：值域与桶", 0, 24);
    txtL(-370, 155, "左半屏：计数排序（值域 0..9）", 0, 17);
    txtL(20, 155, "右半屏：桶排序（5 个筐，每筐 20 个数）", 0, 17);
    txtL(-370, -58, "绿柱 = 前缀和：这个值在输出里的结束位置", 0, 14);
    for (int v = 0; v <= 9; v++) num(-347 + 30 * v, -26, v, 0, 14);
    redrawReset();
    redraw();
    wait(0.4);

    for (int i = 0; i < N; i++) {              // 数频次
        curIn = i;
        curV = CA[i];
        cnt[CA[i]]++;
        for (int v = 0; v <= 9; v++) disp[v] = cnt[v];
        redraw();
        wait(0.05);
    }
    curIn = -1;
    curV = -1;
    redraw();
    wait(0.3);

    ph = 1;
    for (int v = 1; v <= 9; v++) {             // 前缀和
        curV = v;
        cnt[v] += cnt[v - 1];
        for (int w = 0; w <= 9; w++) disp[w] = cnt[w];
        redraw();
        wait(0.06);
    }
    curV = -1;
    redraw();
    wait(0.3);

    ph = 2;
    for (int i = N - 1; i >= 0; i--) {        // 倒着放进输出（稳定）
        int v = CA[i];
        curIn = i;
        curV = v;
        int pos = --cnt[v];
        outv[pos] = v;
        outHas[pos] = true;
        for (int w = 0; w <= 9; w++) disp[w] = cnt[w];
        redraw();
        wait(0.05);
    }
    curIn = -1;
    curV = -1;
    redraw();
    wait(0.6);

    for (int i = 0; i < N; i++) {              // 元素按 值/20 落筐
        curIn2 = i;
        int b = RA[i] / 20;
        bval[b][blen[b]++] = RA[i];
        redraw();
        wait(0.06);
    }
    curIn2 = -1;
    redraw();
    wait(0.3);

    for (int b = 0; b < 5; b++) {              // 筐内插入排序
        for (int i = 1; i < blen[b]; i++) {
            int x = bval[b][i], j = i - 1;
            while (j >= 0) {
                curB = b; curBi = j; curBj = i;
                redraw();
                wait(0.05);
                if (bval[b][j] <= x) break;
                bval[b][j + 1] = bval[b][j];
                j--;
            }
            bval[b][j + 1] = x;
        }
    }
    curB = -1;
    redraw();
    wait(0.3);

    int k = 0;
    for (int b = 0; b < 5; b++) {              // 按筐号输出
        for (int i = 0; i < blen[b]; i++) {
            outv2[k] = bval[b][i];
            outHas2[k] = true;
            k++;
            redraw();
            wait(0.04);
        }
    }
    redraw();
    wait(0.9);

    printf("计数排序：");
    for (int i = 0; i < N; i++) printf("%d ", outv[i]);
    printf("\\n桶排序：");
    for (int i = 0; i < N; i++) printf("%d ", outv2[i]);
    printf("\\n非比较排序，复杂度 O(n+k)\\n");
    return 0;
}
`,
  },
  '基数排序：按位分桶': {
    group: 'GoC 可视化·排序',
    stdin: '',
    code: `// 基数排序（局部重绘）：从个位开始，一位一位地分桶。
// 标题、「当前」标签和底部说明只画一次；趟数文字、数组格、桶框、桶号、桶内数字、
// 输出格各记上次状态，每帧只擦变了的槽位，被擦到的桶号/桶内数字/输出格按 z 序
// 补画，不整屏 cls。
// 每一趟都是一次稳定的分桶（桶内保持原来的先后次序），
// 所以低位的次序不会被破坏；一直排到最高位，整个数就排好啦。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 12;
int a[N] = {170, 45, 75, 90, 2, 802, 24, 66, 8, 301, 123, 55};
int tmp[N];
int bk[10][12], blen[10];
bool outHas[12];
int curIdx = -1, curB = -1, readB = -1, readK = -1;
int pass = 0, expv = 1;

void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void num(double x, double y, int v, int col, int size) {
    char b[16];
    sprintf(b, "%d", v);
    pen.pu().moveTo(x, y).pd().c(col).text(b, col, size);
}
double RX(int i) { return -277 + 50 * i; }
double BX(int b) { return -245 + 54 * b; }

// ---- 局部重绘小框架：脏槽位擦除 + 与擦除区相交的元素按 z 序补画 ----
// 槽位（z 序）：0 趟数文字，1..12 当前数组格，13..22 桶框，23..32 桶号，
// 33..152 桶内数字（每桶 12 个位置），153..164 这一趟的输出格
const int KMAX = 12;
const int NS = 165;
long long sKey[NS], sLast[NS];
double sX[NS], sY[NS], sW[NS], sH[NS];
double sOX[NS], sOY[NS], sOW[NS], sOH[NS];
bool sHas[NS];
double eX[2 * NS + 8], eY[2 * NS + 8], eW[2 * NS + 8], eH[2 * NS + 8];
int eN = 0;

void setRect(int id, double x, double y, double w, double h) {
    sX[id] = x; sY[id] = y; sW[id] = w; sH[id] = h;
}
void erAdd(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0 || eN >= 2 * NS + 8) return;
    eX[eN] = x; eY[eN] = y; eW[eN] = w; eH[eN] = h; eN++;
}
bool erHit(double x, double y, double w, double h) {
    for (int k = 0; k < eN; k++)
        if (x - w / 2 < eX[k] + eW[k] / 2 && x + w / 2 > eX[k] - eW[k] / 2 &&
            y - h / 2 < eY[k] + eH[k] / 2 && y + h / 2 > eY[k] - eH[k] / 2) return true;
    return false;
}
void erErase(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0) return;
    pen.setAngle(0);                                       // clsRec/rr 都跟朝向转，先归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    erAdd(x, y, w, h);
}

long long slotKey(int id) {
    if (id == 0) return pass * 100 + expv;
    if (id < 13) {
        int i = id - 1;
        return a[i] + 1024 * ((i == curIdx) ? 5 : 2);
    }
    if (id < 23) return (id - 13 == readB) ? 5 : 8;        // 桶框只有颜色会变
    if (id < 33) return 0;                                 // 桶号：常量，只会被补画
    if (id < 153) {
        int t = id - 33, b = t / KMAX, k = t % KMAX;
        if (k >= blen[b]) return -1;
        int c = (b == curB && k == blen[b] - 1) ? 1 : 0;
        return 1 + bk[b][k] + 1024 * c;
    }
    int i = id - 153;
    int col = (i == readK) ? 13 : (outHas[i] ? 3 : 8);
    return col + 16 * (outHas[i] ? tmp[i] + 1 : 0);
}

void slotRect(int id) {
    if (id == 0) {
        setRect(id, -190, 190, 380, 28);
    } else if (id < 13) {
        setRect(id, RX(id - 1), 250, 48, 40);
    } else if (id < 23) {
        setRect(id, BX(id - 13), 30, 54, 144);
    } else if (id < 33) {
        setRect(id, BX(id - 23), 85, 30, 24);
    } else if (id < 153) {
        int t = id - 33, b = t / KMAX, k = t % KMAX;
        setRect(id, BX(b), 58 - 24 * k, 46, 20);
    } else {
        setRect(id, RX(id - 153), -120, 48, 40);
    }
}

void slotPaint(int id) {
    if (id == 0) {
        char lb[64];
        const char* place = (expv == 1) ? "个位" : (expv == 10 ? "十位" : "百位");
        sprintf(lb, "第 %d 趟：按%s（10^%d）分桶", pass, place, pass - 1);
        txtL(-370, 190, lb, 0, 18);
    } else if (id < 13) {                                  // 当前数组
        int i = id - 1;
        double x = RX(i);
        int col = (i == curIdx) ? 5 : 2;
        pen.pu().moveTo(x, 250).pd().c(col).size(2).rr(46, 36);
        num(x, 250, a[i], 0, 16);
    } else if (id < 23) {                                  // 十个桶的框
        int b = id - 13;
        double x = BX(b);
        int col = (b == readB) ? 5 : 8;
        pen.pu().moveTo(x, 30).pd().c(col).size(2).r(50, 140);
    } else if (id < 33) {                                  // 桶号
        num(BX(id - 23), 85, id - 23, 0, 16);
    } else if (id < 153) {                                 // 桶内数字
        int t = id - 33, b = t / KMAX, k = t % KMAX;
        int c = (b == curB && k == blen[b] - 1) ? 1 : 0;
        num(BX(b), 58 - 24 * k, bk[b][k], c, 13);
    } else {                                               // 这一趟的输出
        int i = id - 153;
        double x = RX(i);
        int col = (i == readK) ? 13 : (outHas[i] ? 3 : 8);
        pen.pu().moveTo(x, -120).pd().c(col).size(2).rr(46, 36);
        if (outHas[i]) num(x, -120, tmp[i], 0, 16);
    }
}

void redraw() {
    for (int id = 0; id < NS; id++) { sKey[id] = slotKey(id); slotRect(id); }
    eN = 0;
    for (int id = 0; id < NS; id++) {                      // 只擦状态变了的槽位
        if (sKey[id] == sLast[id]) continue;
        if (sKey[id] < 0) {                                // 桶内这一格空了：擦掉上次那块
            if (sHas[id]) erErase(sOX[id], sOY[id], sOW[id], sOH[id]);
        } else if (sHas[id]) {
            double x1 = sX[id] - sW[id] / 2, x2 = sX[id] + sW[id] / 2;
            double y1 = sY[id] - sH[id] / 2, y2 = sY[id] + sH[id] / 2;
            if (sOX[id] - sOW[id] / 2 < x1) x1 = sOX[id] - sOW[id] / 2;
            if (sOX[id] + sOW[id] / 2 > x2) x2 = sOX[id] + sOW[id] / 2;
            if (sOY[id] - sOH[id] / 2 < y1) y1 = sOY[id] - sOH[id] / 2;
            if (sOY[id] + sOH[id] / 2 > y2) y2 = sOY[id] + sOH[id] / 2;
            erErase((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
        } else {
            erErase(sX[id], sY[id], sW[id], sH[id]);
        }
    }
    for (int id = 0; id < NS; id++) {                      // 按 z 序补画被擦到的桶号/输出格
        if (sKey[id] >= 0 &&
            (sKey[id] != sLast[id] || erHit(sX[id], sY[id], sW[id], sH[id]))) {
            pen.setAngle(0);
            slotPaint(id);
            erAdd(sX[id], sY[id], sW[id], sH[id]);
        }
        sLast[id] = sKey[id];
        sOX[id] = sX[id]; sOY[id] = sY[id]; sOW[id] = sW[id]; sOH[id] = sH[id];
        sHas[id] = (sKey[id] >= 0);
    }
}
void redrawReset() {
    for (int id = 0; id < NS; id++) { sLast[id] = -2; sHas[id] = false; }
}

int main() {
    pen.speed(10);
    // 静态背景只画一次：标题、「当前」标签、底部说明（都在动态槽位之外）
    txtL(-370, 280, "基数排序：按位分桶", 0, 24);
    txt(-352, 250, "当前", 0, 14);
    txt(0, -185, "桶内保持原来的先后次序（稳定），所以低位排好的顺序不会被高位打乱", 0, 16);
    redrawReset();
    redraw();
    wait(0.4);

    int maxv = a[0];
    for (int i = 1; i < N; i++) if (a[i] > maxv) maxv = a[i];

    for (expv = 1; expv <= maxv; expv *= 10) {
        pass++;
        memset(blen, 0, sizeof(blen));
        memset(outHas, 0, sizeof(outHas));
        curIdx = -1; curB = -1; readB = -1; readK = -1;
        redraw();
        wait(0.2);

        for (int i = 0; i < N; i++) {          // 各位分桶
            curIdx = i;
            curB = (a[i] / expv) % 10;
            bk[curB][blen[curB]++] = a[i];
            redraw();
            wait(0.05);
        }
        curIdx = -1;
        curB = -1;
        redraw();
        wait(0.2);

        int k = 0;
        for (int b = 0; b < 10; b++) {         // 按桶号读出来
            readB = b;
            for (int i = 0; i < blen[b]; i++) {
                tmp[k] = bk[b][i];
                outHas[k] = true;
                readK = k;
                redraw();
                wait(0.045);
                k++;
            }
        }
        readB = -1; readK = -1;
        for (int i = 0; i < N; i++) a[i] = tmp[i];   // 稳定地写回
        redraw();
        wait(0.35);
    }

    redraw();
    wait(0.9);
    printf("排序结果：");
    for (int i = 0; i < N; i++) printf("%d ", a[i]);
    printf("\\n复杂度 O(d(n+10))，d 是最大位数；每一趟都必须稳定。\\n");
    return 0;
}
`,
  },
  '顺序表：插入删除与二分查找': {
    group: 'GoC 可视化·线性表',
    stdin: '',
    code: `// 顺序表：插入删除 + 二分查找（局部重绘版）
// 一排格子就是数组 a[0..n-1]。插入时后面的元素整体右移一格（画出搬家的箭头），
// 删除时整体左移一格；二分查找时把左右边界 lo/hi 和中间位置 mid 标出来。
// 标题和下标只画一次；每帧只擦掉「颜色或内容变了」的格子槽位再重画，不整屏 cls。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int CAP = 10;
const double CW = 58, PITCH = 64;

int a[CAP] = {1, 3, 5, 7, 9, 11, 13, 15};
int n = 8;                 // 普通数组不会自己记长度，长度得自己带着
int hid[CAP];              // 1 = 这个格子已经搬空了
int vis = 8;               // 画面上有内容的格子数
int hSrc = -1, hDst = -1, hNew = -1;
int bsLo = -1, bsHi = -1, bsMid = -1, bsFound = -1;
char note[110];

double X0 = -(CAP * PITCH - 6) / 2.0;

double cx(int i) { return X0 + i * PITCH + CW / 2; }

// ---- 局部重绘小工具：擦槽 + 脏跟踪 ----
int lastCol[CAP], lastVal[CAP];      // 格子上次的颜色 / 内容（-1 = 空格子）
int lastLo = -2, lastHi = -2, lastMid = -2;
int hopOn = 0;
double hopX1 = 0, hopX2 = 0;
char lastNote[110];

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                                     // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

// 左对齐的一行说明：内容没变就一个字都不动
void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrowHead(double x, double y, double ang, double len, double w) {
    double a1 = ang + 145, a2 = ang - 145;
    seg(x, y, x + len * sin_deg(a1), y + len * cos_deg(a1), w);
    seg(x, y, x + len * sin_deg(a2), y + len * cos_deg(a2), w);
}

void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 13, w);
}

// 元素从一个格子搬到另一个格子：先往上抬，横着挪过去，再扎下来
void hop(double x1, double y1, double x2, double y2, double yTop, int col) {
    pen.c(col);
    seg(x1, y1, x1, yTop, 3);
    seg(x1, yTop, x2, yTop, 3);
    seg(x2, yTop, x2, y2, 3);
    arrowHead(x2, y2, 180, 13, 3);
    hopOn = 1; hopX1 = x1; hopX2 = x2;    // 记住这条临时箭头，下一帧先擦掉它
}

// 搬家箭头占的是格子上方那条横带（y 33..105），擦它碰不到格子
void wipeHop() {
    if (!hopOn) return;
    double lo = hopX1 < hopX2 ? hopX1 : hopX2;
    double hi = hopX1 < hopX2 ? hopX2 : hopX1;
    wipe((lo + hi) / 2, 69, hi - lo + 22, 72);
    hopOn = 0;
}

void cellState(int i, int& col, int& val) {
    col = 8;
    if (i < vis && !hid[i]) col = 2;
    if (i == hSrc) col = 1;
    if (i == hDst) col = 3;
    if (i == hNew || i == bsFound) col = 5;
    val = (i < vis && !hid[i]) ? a[i] : -1;
}

// 一个格子 = 框 + 内容，槽位比格宽略宽、比槽距略窄，上下不碰下标标签
void drawCell(int i, int col, int val) {
    wipe(cx(i), 0, CW + 4, 66);
    pen.pu().moveTo(cx(i), 0).pd().c(col).size(3).r(CW, 60);
    if (val >= 0) pen.pu().moveTo(cx(i), 0).pd().c(0).text(a[i], 0, 22);
    else pen.pu().moveTo(cx(i), 0).pd().c(8).text("_", 8, 18);
    lastCol[i] = col; lastVal[i] = val;
}

void wipeBracket(int lo, int hi) {
    if (lo < 0 || hi < lo) return;
    double x1 = cx(lo) - 24, x2 = cx(hi) + 24;
    wipe((x1 + x2) / 2, -82, x2 - x1, 46);      // y -105..-59，下标标签在 -50 之外
}

void drawBracket() {
    if (bsLo < 0 || bsHi < bsLo) return;
    pen.c(12);
    seg(cx(bsLo), -74, cx(bsHi), -74, 3);
    seg(cx(bsLo), -74, cx(bsLo), -63, 3);
    seg(cx(bsHi), -74, cx(bsHi), -63, 3);
    pen.pu().moveTo(cx(bsLo), -96).pd().c(12).text("lo=" + std::to_string(bsLo), 12, 14);
    pen.pu().moveTo(cx(bsHi), -96).pd().c(12).text("hi=" + std::to_string(bsHi), 12, 14);
}

void wipeMid(int m) {
    if (m < 0) return;
    wipe(cx(m), 73, 50, 74);                    // y 36..110，格顶在 31.5
}

void drawMid() {
    if (bsMid < 0) return;
    arrow(cx(bsMid), 84, cx(bsMid), 40, 3, 11);
    pen.pu().moveTo(cx(bsMid), 100).pd().c(11).text("mid=" + std::to_string(bsMid), 11, 14);
}

// 静态背景只画一次：标题 + 每个格子的下标
void drawStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).text("顺序表：插入删除与二分查找", 0, 26);
    for (int i = 0; i < CAP; i++) {
        pen.pu().moveTo(cx(i), -50).pd().c(8).text(i, 8, 14);
        lastCol[i] = -1; lastVal[i] = -2;
    }
}

void draw() {
    lineL(note, lastNote, -350, 278, 754, 26, 8, 18);
    wipeHop();
    for (int i = 0; i < CAP; i++) {
        int col, val;
        cellState(i, col, val);
        if (col != lastCol[i] || val != lastVal[i]) drawCell(i, col, val);
    }
    if (bsLo != lastLo || bsHi != lastHi) {
        wipeBracket(lastLo, lastHi);
        drawBracket();
        lastLo = bsLo; lastHi = bsHi;
    }
    if (bsMid != lastMid) {
        wipeMid(lastMid);
        drawMid();
        lastMid = bsMid;
    }
}

int main() {
    pen.speed(10);
    drawStatic();
    snprintf(note, sizeof note, "初始：a[0..7] = 1 3 5 7 9 11 13 15（长度 n 得自己记）");
    draw();
    wait(0.35);

    // 中间插入：下标 3 插入 6，后面的整体后移一位，O(n)
    int pos = 3, val = 6;
    snprintf(note, sizeof note, "插入：把 %d 放进下标 %d，后面的元素要整体右移一格", val, pos);
    draw();
    wait(0.2);
    for (int i = n; i > pos; i--) {
        hSrc = i - 1;
        hDst = i;
        snprintf(note, sizeof note, "先搬最后面：a[%d] = a[%d]（从后往前挪，别覆盖）", i, i - 1);
        draw();
        hop(cx(i - 1), 36, cx(i), 36, 100, 1);
        wait(0.06);
        a[i] = a[i - 1];
        hid[i] = 0;                  // 搬进来的格子重新有效
        hid[i - 1] = 1;
        if (i >= vis) vis = i + 1;
        hSrc = -1;
        snprintf(note, sizeof note, "a[%d] 已经搬到 a[%d]，原来的位置空出来了", i - 1, i);
        draw();
        wait(0.06);
    }
    a[pos] = val;
    hid[pos] = 0;
    hNew = pos;
    hDst = -1;
    n++;
    snprintf(note, sizeof note, "搬完了，a[%d] = %d，现在 n = %d", pos, val, n);
    draw();
    wait(0.25);
    hNew = -1;

    // 删头：整体前移一位，O(n)
    for (int i = 0; i < n - 1; i++) {
        hSrc = i + 1;
        hDst = i;
        snprintf(note, sizeof note, "删首元素：a[%d] = a[%d]，剩下的整体往前挪一格", i, i + 1);
        draw();
        hop(cx(i + 1), 36, cx(i), 36, 100, 1);
        wait(0.05);
        a[i] = a[i + 1];
        hid[i] = 0;                  // 搬进来的格子重新有效
        hid[i + 1] = 1;
        hSrc = -1;
        draw();
        wait(0.05);
    }
    hDst = -1;                       // 删完了，别让最后一格一直挂着绿高亮
    n--;
    vis = n;
    hid[n] = 1;
    snprintf(note, sizeof note, "首元素已经删掉，现在 n = %d", n);
    draw();
    wait(0.25);

    // 二分查找：每一步都标出左右边界和中间位置
    int keys[4] = {7, 10, 15, 1};
    for (int k = 0; k < 4; k++) {
        int key = keys[k];
        int lo = 0, hi = n - 1;
        bsLo = lo;
        bsHi = hi;
        bsMid = -1;
        bsFound = -1;
        snprintf(note, sizeof note, "二分查找 %d：当前区间 [%d, %d]", key, lo, hi);
        draw();
        wait(0.08);
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;     // 写 (lo + hi) / 2 会溢出
            bsMid = mid;
            if (a[mid] == key) {
                bsFound = mid;
                snprintf(note, sizeof note, "查 %d：mid = %d，a[mid] = %d，命中！", key, mid, a[mid]);
                draw();
                break;
            }
            if (a[mid] < key) {
                lo = mid + 1;
                snprintf(note, sizeof note, "查 %d：mid = %d，a[mid] = %d < %d，去右半边 [%d, %d]",
                         key, mid, a[mid], key, lo, hi);
            } else {
                hi = mid - 1;
                snprintf(note, sizeof note, "查 %d：mid = %d，a[mid] = %d > %d，去左半边 [%d, %d]",
                         key, mid, a[mid], key, lo, hi);
            }
            bsLo = lo;
            bsHi = hi;
            draw();
            wait(0.07);
        }
        if (bsFound >= 0)
            snprintf(note, sizeof note, "找到 %d：下标 %d", key, bsFound);
        else
            snprintf(note, sizeof note, "%d 不在这张表里（区间空了）", key);
        draw();
        wait(0.15);
        bsLo = bsHi = bsMid = bsFound = -1;
    }

    snprintf(note, sizeof note, "二分查找：每次比较砍掉一半，O(log n)；插入删除却是 O(n)");
    draw();
    wait(0.25);
    printf("顺序表最后是：");
    for (int i = 0; i < n; i++) printf(" %d", a[i]);
    printf("\\n");
    return 0;
}
`,
  },
  '单链表：逆置与快慢指针': {
    group: 'GoC 可视化·线性表',
    stdin: '',
    code: `// 手写单链表：逆置 + 快慢指针（局部重绘版）
// 节点 = 值 + 指向下一个节点的指针。头插法建表（pushFront），
// 逆置用 prev / cur / nxt 三个指针，快慢指针找中点。
// 标题只画一次；节点 / 指针箭头 / head / slow / fast 各记上次状态，只重画变了的。
// 箭头和圆圈有几像素重叠，所以擦完槽用 hit() 把被连带擦到的元素也补画一遍。
#include <goc.h>
#include <cstdio>
#include <cstring>

struct Node {
    int val;
    Node* next;
    Node(int v) : val(v), next(nullptr) {}
};

const int M = 5;
const double NR = 26, PITCH = 100, NY = 80;

int present[M + 1];      // 这个节点建出来没有
int nxt[M + 1];          // next 指向谁的编号（-1 = 空）
int headv = -1;          // 当前的头结点编号
int hiNode = -1;         // 正在处理的节点
int slowv = -1, fastv = -1;
char note[110];

double NX(int v) { return (v - 3) * PITCH; }

// ---- 局部重绘小工具：擦槽 + 脏跟踪 ----
int lastPresent[M + 1], lastNodeCol[M + 1], lastNxt[M + 1];
int lastHead = -2, lastSlow = -2, lastFast = -2;
char lastNote[110];
double rx1[32], ry1[32], rx2[32], ry2[32];
int rn = 0;

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                                     // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

// 擦掉一块并记下来，后面判断谁被连带擦到了
void wipeMark(double x, double y, double w, double h) {
    wipe(x, y, w, h);
    if (rn < 32) {
        rx1[rn] = x - w / 2; ry1[rn] = y - h / 2;
        rx2[rn] = x + w / 2; ry2[rn] = y + h / 2;
        rn++;
    }
}

int hit(double x1, double y1, double x2, double y2) {
    for (int k = 0; k < rn; k++)
        if (x1 <= rx2[k] && x2 >= rx1[k] && y1 <= ry2[k] && y2 >= ry1[k]) return 1;
    return 0;
}

void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrowHead(double x, double y, double ang, double len, double w) {
    double a1 = ang + 145, a2 = ang - 145;
    seg(x, y, x + len * sin_deg(a1), y + len * cos_deg(a1), w);
    seg(x, y, x + len * sin_deg(a2), y + len * cos_deg(a2), w);
}

void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 13, w);
}

// 一段两头平的弧：bulge > 0 向上鼓，bulge < 0 向下鼓
void arcTo(double x1, double y1, double x2, double y2, double bulge, int col) {
    pen.c(col);
    const double PI = 3.14159265358979;
    double px = x1, py = y1;
    int steps = 14;
    for (int i = 1; i <= steps; i++) {
        double t = (double)i / steps;
        double s = sin(PI * t);
        double x = x1 + (x2 - x1) * t;
        double y = y1 + (y2 - y1) * t + bulge * s * s;
        seg(px, py, x, y, 3);
        px = x;
        py = y;
    }
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 12, 3);
}

// 节点槽位：圆圈 + 里面的数字
void nodeBox(int v, double& x1, double& y1, double& x2, double& y2) {
    x1 = NX(v) - 28; x2 = NX(v) + 28;
    y1 = NY - 28; y2 = NY + 28;
}

// 箭头槽位：正向是两圆之间那一小段，反向是往下鼓的弧（含箭头尖）
void arrowBox(int v, int t, double& x1, double& y1, double& x2, double& y2) {
    if (t > v) {
        x1 = NX(v) + NR - 2; x2 = NX(t) - NR + 2;
        y1 = NY - 10; y2 = NY + 10;
    } else {
        x1 = NX(t) + NR - 2; x2 = NX(v) - NR + 2;
        y1 = NY - 36; y2 = NY + 10;
    }
}

void drawNode(int v, int col) {
    pen.pu().moveTo(NX(v), NY).pd().c(col).size(3).o(NR);
    pen.pu().moveTo(NX(v), NY).pd().c(0).text(v, 0, 20);
}

void drawArrow(int v) {
    int t = nxt[v];
    if (t > v) arrow(NX(v) + NR, NY, NX(t) - NR, NY, 3, 2);
    else arcTo(NX(v) - NR, NY, NX(t) + NR, NY, -34, 1);
}

void drawHead(int v) {
    arrow(NX(v), 132, NX(v), NY + NR + 6, 3, 12);
    pen.pu().moveTo(NX(v), 150).pd().c(12).text("head", 12, 16);
}

void drawTag(int v, const char* s, int col) {
    pen.pu().moveTo(NX(v), NY - 42).pd().c(col).size(2).oo(9, col);
    pen.pu().moveTo(NX(v), NY - 62).pd().c(col).text(s, col, 14);
}

// 静态背景只画一次
void drawStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).text("单链表：逆置与快慢指针", 0, 26);
    for (int v = 1; v <= M; v++) {
        lastPresent[v] = 0; lastNodeCol[v] = -1; lastNxt[v] = -1;
    }
}

void draw() {
    lineL(note, lastNote, -350, 278, 754, 26, 8, 18);
    rn = 0;
    // ① 先把「状态变了」的元素的旧槽位擦掉
    for (int v = 1; v <= M; v++) {
        int col = present[v] ? (v == hiNode ? 5 : 2) : 0;
        if (present[v] != lastPresent[v] || col != lastNodeCol[v])
            wipeMark(NX(v), NY, 56, 56);
        int t = (present[v] && nxt[v] > 0 && present[nxt[v]]) ? nxt[v] : -1;
        if (t != lastNxt[v] && lastNxt[v] > 0) {
            double x1, y1, x2, y2;
            arrowBox(v, lastNxt[v], x1, y1, x2, y2);
            wipeMark((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
        }
    }
    if (headv != lastHead && lastHead > 0) wipeMark(NX(lastHead), 134, 44, 50);
    if (slowv != lastSlow && lastSlow > 0) wipeMark(NX(lastSlow), NY - 50.5, 36, 41);
    if (fastv != lastFast && lastFast > 0) wipeMark(NX(lastFast), NY - 50.5, 36, 41);
    // ② 重画节点：自己变了的 + 被连带擦到的
    for (int v = 1; v <= M; v++) {
        if (!present[v]) { lastPresent[v] = 0; lastNodeCol[v] = 0; continue; }
        int col = (v == hiNode) ? 5 : 2;
        double x1, y1, x2, y2;
        nodeBox(v, x1, y1, x2, y2);
        if (!lastPresent[v] || col != lastNodeCol[v] || hit(x1, y1, x2, y2))
            drawNode(v, col);
        lastPresent[v] = 1; lastNodeCol[v] = col;
    }
    // ③ 重画指针箭头：箭头移动时旧槽已经在①擦掉了
    for (int v = 1; v <= M; v++) {
        int t = (present[v] && nxt[v] > 0 && present[nxt[v]]) ? nxt[v] : -1;
        if (t > 0) {
            double x1, y1, x2, y2;
            arrowBox(v, t, x1, y1, x2, y2);
            if (t != lastNxt[v] || hit(x1, y1, x2, y2)) drawArrow(v);
        }
        lastNxt[v] = t;
    }
    // ④ head / slow / fast 三个标记
    int hd = (headv > 0 && present[headv]) ? headv : -1;
    if (hd > 0 && (hd != lastHead || hit(NX(hd) - 22, 109, NX(hd) + 22, 159)))
        drawHead(hd);
    lastHead = hd;
    if (slowv > 0 && (slowv != lastSlow || hit(NX(slowv) - 18, 9, NX(slowv) + 18, 50)))
        drawTag(slowv, "slow", 1);
    lastSlow = slowv > 0 ? slowv : -1;
    if (fastv > 0 && (fastv != lastFast || hit(NX(fastv) - 18, 9, NX(fastv) + 18, 50)))
        drawTag(fastv, "fast", 2);
    lastFast = fastv > 0 ? fastv : -1;
}

void pushFront(Node*& head, int v) {          // 头插：传引用改头指针
    Node* n = new Node(v);
    n->next = head;
    head = n;
}

bool hasCycle(Node* head) {                   // 快慢指针相遇即有环
    Node *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

int main() {
    pen.speed(10);
    drawStatic();
    Node* head = nullptr;
    snprintf(note, sizeof note, "头插法建表：pushFront 每次都把新节点插到最前面");
    draw();
    wait(0.35);

    int vs[5] = {5, 4, 3, 2, 1};
    for (int i = 0; i < 5; i++) {
        int v = vs[i];
        int oldHead = head ? head->val : -1;
        pushFront(head, v);
        present[v] = 1;
        nxt[v] = oldHead;
        headv = v;
        hiNode = v;
        snprintf(note, sizeof note, "pushFront(%d)：新节点成了头，next 指向原来的头 %d", v, oldHead);
        draw();
        wait(0.2);
    }
    hiNode = -1;
    snprintf(note, sizeof note, "建好了：1 -> 2 -> 3 -> 4 -> 5（头插把顺序倒过来了）");
    draw();
    wait(0.3);

    // 快慢指针找中点
    Node *slow = head, *fast = head;
    int round = 0;
    while (fast && fast->next) {
        round++;
        slow = slow->next;
        fast = fast->next->next;
        slowv = slow->val;
        fastv = fast->val;
        snprintf(note, sizeof note, "第 %d 轮：slow 走 1 步，fast 走 2 步（slow=%d, fast=%d）",
                 round, slowv, fastv);
        draw();
        wait(0.3);
    }
    snprintf(note, sizeof note, "fast 到头了，slow 停在第 %d 个节点（值 %d）——这就是中点", round + 1, slowv);
    draw();
    wait(0.35);
    slowv = fastv = -1;

    bool cycle = hasCycle(head);
    snprintf(note, sizeof note, "hasCycle：快慢指针%s相遇，所以%s环",
             cycle ? "没有" : "有", cycle ? "有" : "没");
    draw();
    wait(0.3);

    // 三指针原地逆置
    Node* prev = nullptr;
    Node* cur = head;
    int step = 0;
    while (cur) {
        Node* nxtReal = cur->next;
        int v = cur->val;
        cur->next = prev;
        nxt[v] = prev ? prev->val : -1;       // 画面跟着真指针一起改
        prev = cur;
        cur = nxtReal;
        hiNode = v;
        step++;
        snprintf(note, sizeof note, "逆置第 %d 步：节点 %d 的 next 改指 %d（红箭头）",
                 step, v, nxt[v]);
        draw();
        if (nxt[v] > 0) arcTo(NX(v) - NR, NY, NX(nxt[v]) + NR, NY, -34, 1);
        wait(0.22);
    }
    head = prev;
    headv = head->val;
    hiNode = -1;
    snprintf(note, sizeof note, "逆置完了：5 -> 4 -> 3 -> 2 -> 1（头结点换成了 %d）", headv);
    draw();
    wait(0.4);

    printf("原链表 1 2 3 4 5，中点是 3，逆置后是");
    Node* p = head;
    for (; p; p = p->next) printf(" %d", p->val);
    printf("\\n");
    while (head) {
        Node* d = head;
        head = head->next;
        delete d;
    }
    return 0;
}
`,
  },
  '数组：栈上与堆上初始化（画图版）': {
    group: 'GoC 可视化·线性表',
    stdin: '',
    code: `// 数组：栈上与堆上初始化（局部重绘版）
// 同样是五个数，一个放在栈上（编译器分配，函数返回就还回去），
// 一个放在堆上（new 出来，得自己 delete[]，忘了就是内存泄漏）。
// 左半边是栈、右半边是堆，每一格都标了地址。
// 外框 / 地址 / 小标题只画一次；每帧只擦重画「颜色或内容变了」的格子。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int M = 5;
const double SW = 42, SH = 44, SP = 46, VP = 50;
const double LX = -190, RX = 190, BY = -140;

int stackArr[5];                        // 栈上：没有初始值
int heapArr[5];                         // 堆上：new int[5]，也没有初始值
int stackInit[5] = {1, 3, 2, 5, 4};
int heapInit[5] = {1, 3, 2, 5, 4};

int phase = 0;                          // 0 = 没初始值，1 = 有初始值
int filled = 0;                         // 已经填了几格
int hi = -1;                            // 正在填的那一格
int released = 0;                       // 堆上的内存还回去了没有
char note[110];

// ---- 局部重绘：脏跟踪 ----
int lastCol[2][M], lastTxt[2][M];       // txt：-2 = "x"，-1 = "?"，>=0 是值
int lastPhase = -1, lastReleased = -1;
char lastNote[110];

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                                     // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

double cellX(int p, int i) { return (p ? RX : LX) - 92 + i * SP; }
double cellY(int i) { return BY + i * VP; }

void cellState(int p, int i, int& col, int& txt) {
    const int* vals = phase ? (p ? heapInit : stackInit) : (p ? heapArr : stackArr);
    col = 8;
    if (!released || !p) {
        if (i < filled) col = 2;
        if (i == hi) col = 5;
    }
    if (released && p) txt = -2;
    else if (i < filled) txt = vals[i];
    else txt = -1;
}

// 一格 = 框 + 内容；槽位比格宽略宽、比槽距略窄，左右碰不到地址标签
void drawCell(int p, int i, int col, int txt) {
    double x = cellX(p, i), y = cellY(i);
    wipe(x, y, SW + 3, SH + 4);
    pen.pu().moveTo(x, y).pd().c(col).size(3).r(SW, SH);
    if (txt == -2) pen.pu().moveTo(x, y).pd().c(8).text("x", 8, 16);
    else if (txt >= 0) pen.pu().moveTo(x, y).pd().c(0).text(txt, 0, 18);
    else pen.pu().moveTo(x, y).pd().c(8).text("?", 8, 18);
    lastCol[p][i] = col; lastTxt[p][i] = txt;
}

// 面板下面那行说明会随 phase 换字，所以它是动态槽位
void drawCaption(int p) {
    double cx0 = p ? RX : LX;
    const char* cap;
    if (!p) cap = phase ? "int nums[5] = {1,3,2,5,4}" : "int arr[5]（逐个赋值）";
    else cap = phase ? "new int[5] {1,3,2,5,4}" : "new int[5]（逐个赋值）";
    wipe(cx0, -222, 340, 24);
    pen.pu().moveTo(cx0, -222).pd().c(0).text(cap, 0, 15);
}

// 释放堆内存时打的那个叉，画在格子之上，只画一次
void drawCross() {
    pen.c(8);
    seg(RX - 130, -170, RX + 130, 90, 4);
    seg(RX - 130, 90, RX + 130, -170, 4);
}

// 静态背景只画一次：标题、两个小标题、外框、每格的地址
void drawStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).text("数组：栈上与堆上初始化", 0, 26);
    pen.pu().moveTo(LX, 150).pd().c(0).text("栈：函数里的局部数组", 0, 20);
    pen.pu().moveTo(RX, 150).pd().c(0).text("堆：new 出来的数组", 0, 20);
    for (int p = 0; p < 2; p++) {
        double cx0 = p ? RX : LX;
        pen.pu().moveTo(cx0, -40).pd().c(8).size(2).r(340, 300);
        for (int i = 0; i < M; i++) {
            char ad[16];
            snprintf(ad, sizeof ad, "0x%X", (p ? 0x1000u : 0x7FF0u) + 4 * i);
            double ax = p ? cx0 + 120 : cx0 - 160;
            pen.pu().moveTo(ax, cellY(i)).pd().c(8).textL(ad, 8, 12);
            lastCol[p][i] = -1; lastTxt[p][i] = -3;
        }
    }
}

void draw() {
    lineL(note, lastNote, -350, 278, 754, 26, 8, 18);
    if (phase != lastPhase) {
        drawCaption(0);
        drawCaption(1);
        lastPhase = phase;
    }
    for (int p = 0; p < 2; p++) {
        for (int i = 0; i < M; i++) {
            int col, txt;
            cellState(p, i, col, txt);
            if (col != lastCol[p][i] || txt != lastTxt[p][i]) drawCell(p, i, col, txt);
        }
    }
    if (released != lastReleased) {
        if (released) drawCross();
        lastReleased = released;
    }
}

int main() {
    pen.speed(10);
    drawStatic();
    snprintf(note, sizeof note, "没初始值的数组：格子里的内容是不确定的（这里画成 ?）");
    draw();
    wait(0.4);

    // 栈上：for 循环逐个赋值；堆上：new 出来以后同样要自己赋值
    for (int i = 0; i < M; i++) {
        stackArr[i] = i * i;
        heapArr[i] = 10 + i;
        filled = i + 1;
        hi = i;
        snprintf(note, sizeof note, "第 %d 格：栈上 arr[%d] = %d，堆上 arr1[%d] = %d",
                 i + 1, i, stackArr[i], i, heapArr[i]);
        draw();
        wait(0.18);
    }
    hi = -1;
    snprintf(note, sizeof note, "栈上是 0 1 4 9 16，堆上是 10 11 12 13 14：内容一样，放的地方不同");
    draw();
    wait(0.4);

    // 带初始值：编译器把初始化列表里的值直接搬进格子
    phase = 1;
    filled = 0;
    for (int i = 0; i < M; i++) {
        filled = i + 1;
        hi = i;
        snprintf(note, sizeof note, "有初始值：第 %d 格直接搬进 %d（栈和堆都一样）", i + 1, stackInit[i]);
        draw();
        wait(0.15);
    }
    hi = -1;
    snprintf(note, sizeof note, "栈上的数组函数一返回就自动回收；堆上的必须自己 delete[]");
    draw();
    wait(0.4);

    // 释放堆上的那块内存
    released = 1;
    filled = 0;
    snprintf(note, sizeof note, "delete[] arr1：堆上的内存还回去了，忘了就是内存泄漏");
    draw();
    wait(0.45);

    printf("栈上 %d %d %d %d %d，堆上 %d %d %d %d %d，最后 delete[] 把堆上那块还了\\n",
           stackInit[0], stackInit[1], stackInit[2], stackInit[3], stackInit[4],
           heapInit[0], heapInit[1], heapInit[2], heapInit[3], heapInit[4]);
    return 0;
}
`,
  },
  '链表：节点与构建': {
    group: 'GoC 可视化·线性表',
    stdin: '',
    code: `// 链表：节点定义与构建（局部重绘版）
// 节点 = 值 + 指向下一个节点的指针。数组靠下标定位，链表靠指针串起来。
// 这里把 ListNode 画成一个分成两半的盒子：左边是 val，右边是 next。
// 标题只画一次；节点 / 箭头 / head / len 各记上次状态，只擦重画变了的槽位。
#include <goc.h>
#include <cstdio>
#include <cstring>

struct ListNode {
    int val;         // 节点值
    ListNode *next;  // 指向下一节点的指针
    ListNode(int x) : val(x), next(nullptr) {}   // 构造函数
};

const int M = 5;
const int vals[M] = {1, 3, 2, 5, 4};
const double BW = 72, BH = 50, PITCHX = 110, NY = 60;

int built = 0;      // 已经 new 出来的节点数
int linked = 0;     // 已经接上的 next 指针数
int hiNode = -1;    // 正在处理的节点
int walk = -1;      // 遍历走到哪一个
int dead[M];        // 已经 delete 掉的节点
int len = 0;
char note[110];

double NX(int i) { return (i - 2) * PITCHX; }

// ---- 局部重绘小工具：擦槽 + 脏跟踪 ----
int lastNodeOn[M], lastNodeCol[M], lastArrow[M];
int lastNull = -1, lastHead = -1, lastLen = -1;
char lastNote[110];
double rx1[32], ry1[32], rx2[32], ry2[32];
int rn = 0;

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                                     // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

void wipeMark(double x, double y, double w, double h) {
    wipe(x, y, w, h);
    if (rn < 32) {
        rx1[rn] = x - w / 2; ry1[rn] = y - h / 2;
        rx2[rn] = x + w / 2; ry2[rn] = y + h / 2;
        rn++;
    }
}

int hit(double x1, double y1, double x2, double y2) {
    for (int k = 0; k < rn; k++)
        if (x1 <= rx2[k] && x2 >= rx1[k] && y1 <= ry2[k] && y2 >= ry1[k]) return 1;
    return 0;
}

void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrowHead(double x, double y, double ang, double len, double w) {
    double a1 = ang + 145, a2 = ang - 145;
    seg(x, y, x + len * sin_deg(a1), y + len * cos_deg(a1), w);
    seg(x, y, x + len * sin_deg(a2), y + len * cos_deg(a2), w);
}

void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 13, w);
}

int nodeCol(int i) {
    if (i >= built) return 0;
    int col = 2;
    if (dead[i]) col = 8;
    if (i == hiNode) col = 5;
    if (i == walk) col = 3;
    return col;
}

int arrowOn(int i) {
    return (i < built && i < linked && !dead[i] && !dead[i + 1]) ? 1 : 0;
}

void drawNode(int i, int col) {
    double x = NX(i), y = NY;
    pen.pu().moveTo(x, y).pd().c(col).size(3).r(BW, BH);
    seg(x + 2, y - BH / 2, x + 2, y + BH / 2, 2);
    pen.pu().moveTo(x - 17, y).pd().c(0).text(vals[i], 0, 20);
    pen.pu().moveTo(x + 19, y).pd().c(0).text("next", 0, 12);
    pen.pu().moveTo(x, y - BH / 2 - 18).pd().c(8).text("n" + std::to_string(i), 8, 14);
}

void drawNull() {
    pen.pu().moveTo(0, NY).pd().c(8).size(3).r(150, 50);
    pen.pu().moveTo(0, NY).pd().c(8).text("head = nullptr", 8, 16);
}

void drawHead() {
    arrow(NX(0), 132, NX(0), NY + BH / 2 + 6, 3, 12);
    pen.pu().moveTo(NX(0), 150).pd().c(12).text("head", 12, 16);
}

// 静态背景只画一次
void drawStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).text("链表：节点定义与构建", 0, 26);
    for (int i = 0; i < M; i++) {
        lastNodeOn[i] = 0; lastNodeCol[i] = -1; lastArrow[i] = 0;
    }
}

void draw() {
    lineL(note, lastNote, -350, 278, 754, 26, 8, 18);
    rn = 0;
    int wantNull = (built == 0) ? 1 : 0;
    int wantHead = (built > 0 && !dead[0]) ? 1 : 0;
    // ① 擦掉状态变了的元素的旧槽位（节点槽含盒子 + 下面的 nX 标签）
    for (int i = 0; i < M; i++) {
        int on = (i < built) ? 1 : 0;
        int col = nodeCol(i);
        if (on != lastNodeOn[i] || col != lastNodeCol[i]) wipeMark(NX(i), 48, 78, 80);
        int aw = arrowOn(i);
        if (aw != lastArrow[i] && lastArrow[i]) wipeMark(NX(i) + 55, NY, 44, 20);
    }
    if (wantNull != lastNull && lastNull == 1) wipeMark(0, NY, 156, 56);
    if (wantHead != lastHead && lastHead == 1) wipeMark(NX(0), 124, 44, 70);
    // ② 重画节点：自己变了的 + 被箭头槽连带擦到的
    for (int i = 0; i < M; i++) {
        int on = (i < built) ? 1 : 0;
        if (!on) { lastNodeOn[i] = 0; lastNodeCol[i] = 0; continue; }
        int col = nodeCol(i);
        if (!lastNodeOn[i] || col != lastNodeCol[i] || hit(NX(i) - 39, 8, NX(i) + 39, 88))
            drawNode(i, col);
        lastNodeOn[i] = 1; lastNodeCol[i] = col;
    }
    // ③ 重画 next 箭头
    for (int i = 0; i < M - 1; i++) {
        int aw = arrowOn(i);
        if (aw && (aw != lastArrow[i] || hit(NX(i) + 33, 50, NX(i) + 77, 70)))
            arrow(NX(i) + BW / 2, NY, NX(i + 1) - BW / 2, NY, 3, 2);
        lastArrow[i] = aw;
    }
    // ④ 空表框 / head / len
    if (wantNull && (wantNull != lastNull || hit(-78, 32, 78, 88))) drawNull();
    lastNull = wantNull;
    if (wantHead && (wantHead != lastHead || hit(NX(0) - 22, 89, NX(0) + 22, 159)))
        drawHead();
    lastHead = wantHead;
    if (built == 0) {
        // 节点全删完了，len 标签的槽位也要跟着擦掉，别留漂浮残字
        if (lastLen != -1) { wipe(-350, -130, 140, 28); lastLen = -1; }
    } else if (len != lastLen) {
        wipe(-350, -130, 140, 28);
        pen.pu().moveTo(-350, -130).pd().c(0).text("len = " + std::to_string(len), 0, 20);
        lastLen = len;
    }
}

int main() {
    pen.speed(10);
    drawStatic();
    ListNode *nd[M];
    snprintf(note, sizeof note, "先 new 出 5 个节点：每个节点只有自己的值，next 还是空的");
    draw();
    wait(0.35);

    for (int i = 0; i < M; i++) {
        nd[i] = new ListNode(vals[i]);
        built = i + 1;
        hiNode = i;
        snprintf(note, sizeof note, "new ListNode(%d)：n%d 建好了，可还没有人指向它", vals[i], i);
        draw();
        wait(0.18);
    }
    hiNode = -1;

    for (int i = 0; i < M - 1; i++) {
        nd[i]->next = nd[i + 1];
        linked = i + 1;
        hiNode = i + 1;
        snprintf(note, sizeof note, "n%d->next = n%d：把两个节点接起来（next 就是那根箭头）", i, i + 1);
        draw();
        wait(0.18);
    }
    hiNode = -1;
    snprintf(note, sizeof note, "接好了：1 -> 3 -> 2 -> 5 -> 4");
    draw();
    wait(0.3);

    // 链表没有 size 字段，长度只能一步步数出来
    ListNode *p = nd[0];
    len = 0;
    while (p) {
        len++;
        walk = len - 1;
        snprintf(note, sizeof note, "p = p->next：走到第 %d 个节点，值 %d", len, vals[len - 1]);
        draw();
        wait(0.15);
        p = p->next;
    }
    walk = -1;
    snprintf(note, sizeof note, "链表没有 size 字段，长度只能这样一步步数出来：len = %d", len);
    draw();
    wait(0.35);

    // 释放：逐个 delete
    ListNode *cur = nd[0];
    int idx = 0;
    while (cur) {
        ListNode *nxt = cur->next;
        dead[idx] = 1;
        hiNode = -1;
        snprintf(note, sizeof note, "delete n%d：先记住 next，再把自己删掉（不能先断链）", idx);
        draw();
        wait(0.13);
        delete cur;
        cur = nxt;
        idx++;
    }
    built = 0;
    linked = 0;
    snprintf(note, sizeof note, "逐个 delete 完，内存都还回去了");
    draw();
    wait(0.35);

    printf("链表 1 -> 3 -> 2 -> 5 -> 4，长度 %d，节点逐个 delete 掉了\\n", len);
    return 0;
}
`,
  },
  '双向链表：摘除节点': {
    group: 'GoC 可视化·线性表',
    stdin: '',
    code: `// 双向链表：节点定义与摘除（局部重绘版）
// 单链表只能往前走，双向链表多一个 prev，删掉当前节点时不用再回头找前驱。
// 上面那排箭头是 prev，下面那排是 next。
// 标题和底部说明只画一次；节点和两排弧箭头各记上次状态，只擦重画变了的槽位。
#include <goc.h>
#include <cstdio>
#include <cstring>

struct ListNode {
    int val;         // 节点值
    ListNode *next;  // 指向后继节点的指针
    ListNode *prev;  // 指向前驱节点的指针
    ListNode(int x) : val(x), next(nullptr), prev(nullptr) {}
};

const int M = 3;
const int vals[M] = {1, 3, 2};
const double NR = 30, NY = 0;

double NX(int i) { return (i - 1) * 150.0; }

int hasNext[M];        // 这个节点的 next 指到谁（-1 = 空）
int hasPrev[M];        // 这个节点的 prev 指到谁（-1 = 空）
int hiNode = -1;
int walk = -1;
int gone = -1;         // 被摘掉的节点
int rewired = 0;       // 箭头改完了没有
char note[110];

// ---- 局部重绘小工具：擦槽 + 脏跟踪 ----
int lastNodeCol[M], lastNextT[M], lastNextC[M], lastPrevT[M], lastPrevC[M];
char lastNote[110];
double rx1[32], ry1[32], rx2[32], ry2[32];
int rn = 0;

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                                     // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

void wipeMark(double x, double y, double w, double h) {
    wipe(x, y, w, h);
    if (rn < 32) {
        rx1[rn] = x - w / 2; ry1[rn] = y - h / 2;
        rx2[rn] = x + w / 2; ry2[rn] = y + h / 2;
        rn++;
    }
}

int hit(double x1, double y1, double x2, double y2) {
    for (int k = 0; k < rn; k++)
        if (x1 <= rx2[k] && x2 >= rx1[k] && y1 <= ry2[k] && y2 >= ry1[k]) return 1;
    return 0;
}

void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrowHead(double x, double y, double ang, double len, double w) {
    double a1 = ang + 145, a2 = ang - 145;
    seg(x, y, x + len * sin_deg(a1), y + len * cos_deg(a1), w);
    seg(x, y, x + len * sin_deg(a2), y + len * cos_deg(a2), w);
}

// 一段两头平的弧：bulge > 0 向上鼓，bulge < 0 向下鼓
void arcTo(double x1, double y1, double x2, double y2, double bulge, int col) {
    pen.c(col);
    const double PI = 3.14159265358979;
    double px = x1, py = y1;
    int steps = 14;
    for (int i = 1; i <= steps; i++) {
        double t = (double)i / steps;
        double s = sin(PI * t);
        double x = x1 + (x2 - x1) * t;
        double y = y1 + (y2 - y1) * t + bulge * s * s;
        seg(px, py, x, y, 3);
        px = x;
        py = y;
    }
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 12, 3);
}

int nodeCol(int i) {
    int col = 2;
    if (i == hiNode) col = 5;
    if (i == walk) col = 3;
    if (i == gone) col = 8;
    return col;
}

// 被摘掉的那两根箭头就是原来那两根弧换成红色，几何完全一样，直接算成红色即可
int nextCol(int i) {
    if (gone >= 0 && !rewired && i == 0 && hasNext[i] == gone) return 1;
    if (rewired && i == 0) return 3;
    return 2;
}

int prevCol(int i) {
    if (gone >= 0 && !rewired && i == 2 && hasPrev[i] == gone) return 1;
    if (rewired && i == 2) return 3;
    return 2;
}

// 弧的槽位：below = 1 是往下鼓的 next，否则是往上鼓的 prev
void arcBox(int i, int t, int below, double& x1, double& y1, double& x2, double& y2) {
    double xa = below ? NX(i) + NR : NX(i) - NR;
    double xb = below ? NX(t) - NR : NX(t) + NR;
    x1 = (xa < xb ? xa : xb) - 2;
    x2 = (xa < xb ? xb : xa) + 2;
    if (below) { y1 = NY - 62; y2 = NY + 9; }
    else { y1 = NY - 9; y2 = NY + 62; }
}

void wipeArc(int i, int t, int below) {
    double x1, y1, x2, y2;
    arcBox(i, t, below, x1, y1, x2, y2);
    wipeMark((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
}

void drawNode(int i, int col) {
    pen.pu().moveTo(NX(i), NY).pd().c(col).size(3).o(NR);
    pen.pu().moveTo(NX(i), NY).pd().c(0).text(vals[i], 0, 22);
    pen.pu().moveTo(NX(i), NY - NR - 20).pd().c(8).text("n" + std::to_string(i), 8, 14);
}

// 静态背景只画一次：标题 + 底部那句固定说明
void drawStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).text("双向链表：摘除节点", 0, 26);
    pen.pu().moveTo(-350, -180).pd().c(0).text("上面是 prev，下面是 next", 8, 18);
    for (int i = 0; i < M; i++) {
        hasNext[i] = -1; hasPrev[i] = -1;   // 没接上的指针是 -1，别让全局 0 当成「指向 n0」画出幽灵弧
        lastNodeCol[i] = -1;
        lastNextT[i] = -1; lastNextC[i] = -1;
        lastPrevT[i] = -1; lastPrevC[i] = -1;
    }
}

void draw() {
    lineL(note, lastNote, -350, 278, 754, 26, 8, 18);
    rn = 0;
    // ① 擦掉变了的节点 / 弧箭头的旧槽位
    for (int i = 0; i < M; i++) {
        if (nodeCol(i) != lastNodeCol[i]) wipeMark(NX(i), NY - 12.5, 66, 92);
        int nt = (hasNext[i] >= 0 && i != gone) ? hasNext[i] : -1;
        if ((nt != lastNextT[i] || nextCol(i) != lastNextC[i]) && lastNextT[i] >= 0)
            wipeArc(i, lastNextT[i], 1);
        int pt = (hasPrev[i] >= 0 && i != gone) ? hasPrev[i] : -1;
        if ((pt != lastPrevT[i] || prevCol(i) != lastPrevC[i]) && lastPrevT[i] >= 0)
            wipeArc(i, lastPrevT[i], 0);
    }
    // ② 重画节点（槽位含圆圈 + 值 + 下面的 nX 标签）
    for (int i = 0; i < M; i++) {
        int col = nodeCol(i);
        if (col != lastNodeCol[i] || hit(NX(i) - 33, NY - 58.5, NX(i) + 33, NY + 33.5))
            drawNode(i, col);
        lastNodeCol[i] = col;
    }
    // ③ 重画 next（下排）和 prev（上排）：被连带擦到的也补画
    for (int i = 0; i < M; i++) {
        int nt = (hasNext[i] >= 0 && i != gone) ? hasNext[i] : -1;
        int nc = nextCol(i);
        if (nt >= 0) {
            double x1, y1, x2, y2;
            arcBox(i, nt, 1, x1, y1, x2, y2);
            if (nt != lastNextT[i] || nc != lastNextC[i] || hit(x1, y1, x2, y2))
                arcTo(NX(i) + NR, NY, NX(nt) - NR, NY, -60, nc);
        }
        lastNextT[i] = nt; lastNextC[i] = nc;
        int pt = (hasPrev[i] >= 0 && i != gone) ? hasPrev[i] : -1;
        int pc = prevCol(i);
        if (pt >= 0) {
            double x1, y1, x2, y2;
            arcBox(i, pt, 0, x1, y1, x2, y2);
            if (pt != lastPrevT[i] || pc != lastPrevC[i] || hit(x1, y1, x2, y2))
                arcTo(NX(i) - NR, NY, NX(pt) + NR, NY, 60, pc);
        }
        lastPrevT[i] = pt; lastPrevC[i] = pc;
    }
}

int main() {
    pen.speed(10);
    drawStatic();
    ListNode *nd[M];
    snprintf(note, sizeof note, "双向链表：每个节点都认识自己的前驱和后继");
    draw();
    wait(0.35);

    for (int i = 0; i < M; i++) {
        nd[i] = new ListNode(vals[i]);
        hiNode = i;
        snprintf(note, sizeof note, "new ListNode(%d)：n%d 的 next 和 prev 都是空的", vals[i], i);
        draw();
        wait(0.18);
    }
    hiNode = -1;

    // 接 next
    for (int i = 0; i < M - 1; i++) {
        nd[i]->next = nd[i + 1];
        hasNext[i] = i + 1;
        snprintf(note, sizeof note, "n%d->next = n%d", i, i + 1);
        draw();
        wait(0.16);
    }
    // 接 prev
    for (int i = 1; i < M; i++) {
        nd[i]->prev = nd[i - 1];
        hasPrev[i] = i - 1;
        snprintf(note, sizeof note, "n%d->prev = n%d（多一根往回指的箭头）", i, i - 1);
        draw();
        wait(0.16);
    }

    // 正向走一遍
    for (int i = 0; i < M; i++) {
        walk = i;
        snprintf(note, sizeof note, "正向（顺着 next）：第 %d 个节点，值 %d", i + 1, vals[i]);
        draw();
        wait(0.2);
    }
    walk = -1;
    // 反向走一遍
    for (int i = M - 1; i >= 0; i--) {
        walk = i;
        snprintf(note, sizeof note, "反向（顺着 prev）：第 %d 个节点，值 %d", M - i, vals[i]);
        draw();
        wait(0.2);
    }
    walk = -1;

    // 摘掉中间那个节点
    gone = 1;
    snprintf(note, sizeof note, "现在摘掉中间的值 %d（n1）", vals[1]);
    draw();
    wait(0.3);
    snprintf(note, sizeof note, "单链表要回头找前驱；双向链表只要改两根箭头");
    draw();
    wait(0.3);

    // n0->next = n1->next;  n1->next->prev = n0;
    nd[0]->next = nd[1]->next;
    nd[1]->next->prev = nd[0];
    hasNext[0] = 2;
    hasPrev[2] = 0;
    hasNext[1] = -1;
    hasPrev[1] = -1;
    rewired = 1;
    snprintf(note, sizeof note, "n0->next = n1->next（指向 n2），n2->prev = n0，前驱后继接上了");
    draw();
    wait(0.4);
    snprintf(note, sizeof note, "delete n1：n1 没人指了，可以释放了");
    draw();
    wait(0.35);

    printf("正向 1 -> 3 -> 2，反向 2 -> 3 -> 1；删掉 3 之后正向：");
    for (ListNode *p = nd[0]; p; p = p->next) printf(" %d", p->val);
    printf("\\n");
    delete nd[0];
    delete nd[2];
    return 0;
}
`,
  },
  '列表：增删改查与排序（画图版）': {
    group: 'GoC 可视化·线性表',
    stdin: '',
    code: `// 列表：增删改查与排序
// 一排格子就是一个普通数组 nums（空间上限 CAP），长度 len 得自己带着。
// 中间插入、删除都要把后面的元素整体挪位置；排序那一段换成柱状图。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int CAP = 16;
const int DCAP = 12;                   // 画面上画出 12 个格子
const double CW = 46, PITCH = 50;

int nums[CAP] = {1, 3, 2, 5, 4};
int len = 5;
int hiCell = -1;                       // 正在动的格子
int walk = -1;                         // 遍历走到哪
int stale = -1;                        // 没用的格子（range-for 会算进去）
char note[120];

double X0 = -(DCAP * PITCH - 4) / 2.0;
double cx(int i) { return X0 + i * PITCH + CW / 2; }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrowHead(double x, double y, double ang, double len, double w) {
    double a1 = ang + 145, a2 = ang - 145;
    seg(x, y, x + len * sin_deg(a1), y + len * cos_deg(a1), w);
    seg(x, y, x + len * sin_deg(a2), y + len * cos_deg(a2), w);
}

void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 12, w);
}

int hopOn = 0; double hopX1 = 0, hopX2 = 0;   // 箭头槽，供 hop() 记录、wipeHop() 擦除

void hop(double x1, double y1, double x2, double y2, double yTop, int col) {
    pen.c(col);
    seg(x1, y1, x1, yTop, 3);
    seg(x1, yTop, x2, yTop, 3);
    seg(x2, yTop, x2, y2, 3);
    arrowHead(x2, y2, 180, 12, 3);
    hopX1 = x1; hopX2 = x2; hopOn = 1;   // 记下箭头槽，下一帧好擦
}

// ---- 局部重绘基础设施 ----
int lastScene = 0;                     // 0 未画 / 1 格子 / 2 柱状图
int lastCellCol[DCAP], lastCellVal[DCAP];
int lastLen = -1;
int barVal[DCAP], barCol[DCAP];
char lastNote[120];

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                   // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

void wipeHop() {
    double lo = hopX1 < hopX2 ? hopX1 : hopX2;
    double hi = hopX1 < hopX2 ? hopX2 : hopX1;
    wipe((lo + hi) / 2, 68.5, (hi - lo) + 22, 71);   // y[33,104]，不碰格子(顶28)
}

void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}

// 一排格子：i < len 是列表里的元素，i >= len 是没用的格子
void drawList() {
    if (lastScene != 1) {              // 一次性切场景：擦整条内容带，重画静态
        wipe(0, 20, 800, 660);
        pen.pu().moveTo(-350, 330).pd().c(0).text("列表：增删改查与排序", 0, 26);
        for (int i = 0; i < DCAP; i++)
            pen.pu().moveTo(cx(i), -46).pd().c(8).text(i, 8, 13);
        for (int i = 0; i < DCAP; i++) { lastCellCol[i] = -99; lastCellVal[i] = -99999; }
        lastLen = -1; lastNote[0] = 0; hopOn = 0;
        lastScene = 1;
    }
    if (hopOn) { wipeHop(); hopOn = 0; }
    lineL(note, lastNote, -350, 278, 754, 26, 8, 18);
    for (int i = 0; i < DCAP; i++) {
        int col = 8;
        if (i < len) col = 2;
        if (i == hiCell) col = 1;
        if (i == walk) col = 3;
        if (i == stale) col = 1;
        if (col == lastCellCol[i] && nums[i] == lastCellVal[i]) continue;
        wipe(cx(i), 0, 49, 62);        // y[-31,31]，不碰下标标签(-46)
        pen.pu().moveTo(cx(i), 0).pd().c(col).size(3).r(CW, 56);
        pen.pu().moveTo(cx(i), 0).pd().c(i < len ? 0 : 8).text(nums[i], i < len ? 0 : 8, 20);
        lastCellCol[i] = col; lastCellVal[i] = nums[i];
    }
    if (len != lastLen) {
        wipe(-350, -120, 170, 28);
        pen.pu().moveTo(-350, -120).pd().c(0).text("len = " + std::to_string(len), 0, 20);
        lastLen = len;
    }
}

// 柱状图版的选择排序
void drawBars(int scan, int best, int done) {
    double base = -250, bw = 26, gap = 10;
    double x0 = -((len * (bw + gap)) - gap) / 2.0;
    if (lastScene != 2) {              // 一次性切场景：擦整条内容带，重画静态
        wipe(0, 20, 800, 660);
        pen.pu().moveTo(-350, 330).pd().c(0).text("列表排序（柱状图）", 0, 26);
        pen.c(8);
        seg(x0 - 20, base - 6, x0 + len * (bw + gap) + 20, base - 6, 3);  // 地平线下移，避开柱槽
        for (int i = 0; i < len; i++)
            pen.pu().moveTo(x0 + i * (bw + gap) + bw / 2, base - 22).pd().c(8).text(i, 8, 12);
        for (int i = 0; i < DCAP; i++) { barVal[i] = -99999; barCol[i] = -99; }
        lastNote[0] = 0; hopOn = 0;
        lastScene = 2;
    }
    lineL(note, lastNote, -350, 278, 754, 26, 8, 18);
    for (int i = 0; i < len; i++) {
        double h = nums[i] / 10.0 * 300.0;
        double x = x0 + i * (bw + gap) + bw / 2;
        int col = 2;
        if (i < done) col = 3;
        if (i == best) col = 5;
        if (i == scan) col = 1;
        if (nums[i] == barVal[i] && col == barCol[i]) continue;
        wipe(x, -90, 32, 327);         // y[-253.5,73.5]，盖住柱+顶标签，不碰地平线(-256)
        pen.pu().moveTo(x, base + h / 2).pd().c(col).size(3).rr(bw, h);   // 底对齐
        pen.pu().moveTo(x, base + h + 14).pd().c(0).text(nums[i], 0, 15);
        barVal[i] = nums[i]; barCol[i] = col;
    }
}

int main() {
    pen.speed(10);
    snprintf(note, sizeof note, "初始化：1 3 2 5 4（len = %d，普通数组不会自己记长度）", len);
    drawList();
    wait(0.25);

    // 查：访问索引 1
    hiCell = 1;
    snprintf(note, sizeof note, "查：nums[1] = %d（下标定位，O(1)）", nums[1]);
    drawList();
    wait(0.15);
    hiCell = -1;

    // 改：更新索引 1
    nums[1] = 0;
    hiCell = 1;
    snprintf(note, sizeof note, "改：nums[1] = 0（下标定位，直接赋值）");
    drawList();
    wait(0.15);
    hiCell = -1;

    // 增（尾部）
    nums[len++] = 6;
    hiCell = len - 1;
    snprintf(note, sizeof note, "增（尾部）：nums[%d] = 6，len = %d", len - 1, len);
    drawList();
    wait(0.15);
    hiCell = -1;

    // 增（中间）：后面的整体后移一位，从末尾开始挪，先挪的别覆盖
    int pos = 2;
    for (int i = len; i > pos; i--) {
        hiCell = i - 1;
        snprintf(note, sizeof note, "插入 9 到下标 %d：先把 a[%d] 挪到 a[%d]", pos, i - 1, i);
        drawList();
        hop(cx(i - 1), 34, cx(i), 34, 100, 1);
        wait(0.05);
        nums[i] = nums[i - 1];
        hiCell = i;
        drawList();
        wait(0.05);
    }
    nums[pos] = 9;
    len++;
    hiCell = pos;
    snprintf(note, sizeof note, "插入完成：9 落在下标 %d，len = %d", pos, len);
    drawList();
    wait(0.2);
    hiCell = -1;

    // 删：后面的整体前移一位
    for (int i = pos; i < len - 1; i++) {
        hiCell = i + 1;
        snprintf(note, sizeof note, "删除下标 %d：把 a[%d] 挪到 a[%d]", pos, i + 1, i);
        drawList();
        hop(cx(i + 1), 34, cx(i), 34, 100, 1);
        wait(0.05);
        nums[i] = nums[i + 1];
        hiCell = i;
        drawList();
        wait(0.05);
    }
    len--;
    hiCell = -1;
    snprintf(note, sizeof note, "删除完成，len = %d", len);
    drawList();
    wait(0.2);

    // 按下标遍历求和
    int count = 0;
    for (int i = 0; i < len; i++) {
        count += nums[i];
        walk = i;
        snprintf(note, sizeof note, "按下标遍历：第 %d 个是 %d，和 = %d", i + 1, nums[i], count);
        drawList();
        wait(0.05);
    }
    walk = -1;
    snprintf(note, sizeof note, "按下标遍历求和 = %d（只走 len 个格子）", count);
    drawList();
    wait(0.2);

    // range-for 会把整个数组都走一遍，没用的格子也算进去
    int count2 = 0;
    for (int x : nums) count2 += x;
    stale = len;
    snprintf(note, sizeof note, "range-for 求和 = %d：下标 %d 那个格子早就没用了，却还是被算进去（差 %d）",
             count2, len, count2 - count);
    drawList();
    wait(0.25);
    stale = -1;

    // 拼接列表
    int nums2[5] = {6, 8, 7, 10, 9};
    for (int i = 0; i < 5; i++) {
        nums[len++] = nums2[i];
        hiCell = len - 1;
        snprintf(note, sizeof note, "拼接：把 nums2[%d] = %d 接在末尾，len = %d", i, nums2[i], len);
        drawList();
        wait(0.04);
    }
    hiCell = -1;
    snprintf(note, sizeof note, "拼完一共 %d 个元素，下面把它们排个序（柱状图）", len);
    drawList();
    wait(0.15);

    // 排序：这里用选择排序一步步画出来，结果和 sort(nums, nums + len) 完全一样
    for (int i = 0; i < len - 1; i++) {
        int best = i;
        for (int j = i + 1; j < len; j++) {
            if (nums[j] < nums[best]) best = j;
            snprintf(note, sizeof note, "选择排序第 %d 趟：比较下标 %d（%d），当前最小是下标 %d（%d）",
                     i + 1, j, nums[j], best, nums[best]);
            drawBars(j, best, i);
            wait(0.008);
        }
        if (best != i) {
            int t = nums[i];
            nums[i] = nums[best];
            nums[best] = t;
        }
        snprintf(note, sizeof note, "第 %d 趟结束：最小值 %d 换到下标 %d", i + 1, nums[i], i);
        drawBars(-1, -1, i + 1);
        wait(0.05);
    }
    snprintf(note, sizeof note, "排好了：");
    for (int i = 0; i < len; i++) {
        snprintf(note + strlen(note), sizeof note - strlen(note), " %d", nums[i]);
    }
    drawBars(-1, -1, len);
    wait(0.25);

    printf("按下标求和 %d，range-for 求和 %d，排序之后：", count, count2);
    for (int i = 0; i < len; i++) printf(" %d", nums[i]);
    printf("\\n");
    return 0;
}
`,
  },
  '双指针：去重 / 两数之和 / 反转（画图版）': {
    group: 'GoC 可视化·数组技巧',
    stdin: '',
    code: `// 双指针三件套：去重 / 两数之和 / 反转（数据与算法和原版一致）
// 一排 12 个格子就是数组 a。紫箭头 = 指针 r / l，橙箭头 = 写指针 w-1 / 右指针 r。
// 颜色：黄 = 正在比较的格子，绿 = 已保留 / 命中 / 已交换好，蓝 = 有效数据，
//       灰 = 重复被丢弃或还没读到；红色折线箭头 = 元素从一个格子搬到另一个格子。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 12;
const double CW = 56, PITCH = 60, ROWY = 150;

int a[N] = {1, 1, 2, 2, 2, 3, 4, 4, 5, 6, 6, 7};
int mode = 0;                  // 0 去重 1 两数之和 2 反转
int activeN = N;               // 当前有效长度
int pA = -1, pB = -1;          // 两个指针指着哪个下标
int belowA = 0, belowB = 0;    // 1 = 这个箭头画在格子下方
int done[N];                   // 1 = 绿
int hopSrc = -1, hopDst = -1, hopY = 84, hopBelow = 1;
int hop2Src = -1, hop2Dst = -1;
char labA[24], labB[24];
char note[160], note2[160], big[100], result[160];

double cx(int i) { return -(N * PITCH - 4) / 2 + i * PITCH + CW / 2; }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrowHead(double x, double y, double ang, double len, double w) {
    seg(x, y, x + len * sin_deg(ang + 150), y + len * cos_deg(ang + 150), w);
    seg(x, y, x + len * sin_deg(ang - 150), y + len * cos_deg(ang - 150), w);
}

void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 11, w);
}

// 一个指针：箭头 + 名字，below 决定画在格子上面还是下面
void ptr(int idx, const char* lab, int below, int col) {
    if (idx < 0) return;
    if (below) {
        arrow(cx(idx), 46, cx(idx), ROWY - 38, 3, col);
        pen.pu().moveTo(cx(idx), 26).pd().c(col).text(lab, col, 14);
    } else {
        arrow(cx(idx), 254, cx(idx), ROWY + 40, 3, col);
        pen.pu().moveTo(cx(idx), 272).pd().c(col).text(lab, col, 14);
    }
}

// 搬家箭头：从 src 格子弹出去，横着挪到 dst 格子再扎下来
void hop(int src, int dst, double y, int below, int col) {
    if (src < 0 || dst < 0) return;
    double yEdge = below ? ROWY - 36 : ROWY + 36;
    pen.c(col);
    seg(cx(src), yEdge, cx(src), y, 3);
    seg(cx(src), y, cx(dst), y, 3);
    seg(cx(dst), y, cx(dst), yEdge, 3);
    arrowHead(cx(dst), yEdge, below ? 0 : 180, 11, 3);
}

// 把 a[0..cnt-1] 拼成一行字，放在画面下方当结果条
void listStr(char* out, int cap, int cnt) {
    int p = 0;
    out[0] = 0;
    for (int i = 0; i < cnt && p < cap - 8; i++) p += snprintf(out + p, cap - p, "%d ", a[i]);
}

// ---- 局部重绘基础设施 ----
int staticsDone = 0;
int lastCol[N], lastVal[N];
int lastPA = -1, lastPB = -1, lastBelowA = -1, lastBelowB = -1;
char lastLabA[24], lastLabB[24];
int lastHopSrc = -1, lastHopDst = -1, lastHopY = -1, lastHopBelow = -1;
int lastHop2Src = -1, lastHop2Dst = -1, lastHopOn = 0;
double lhx1 = 0, lhy1 = 0, lhx2 = 0, lhy2 = 0;
char lastNote[160], lastNote2[160], lastBig[100], lastResult[160];

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                   // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}

void drawStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).textL("双指针：去重 / 两数之和 / 反转", 0, 26);
    const char* lg[4] = {"正在处理", "已确定", "有效数据", "丢弃/未读"};
    int lc[4] = {5, 3, 2, 8};
    for (int k = 0; k < 4; k++) {
        double x = -350 + k * 170;
        pen.pu().moveTo(x, -140).pd().c(lc[k]).size(3).r(18, 18);
        pen.pu().moveTo(x + 16, -140).pd().c(0).textL(lg[k], 0, 15);
    }
}

void ptrSlot(int idx, int below) {
    if (idx < 0) return;
    if (below) wipe(cx(idx), 66, 58, 98);    // y[17,115]，不碰格子(底116.5)
    else wipe(cx(idx), 233, 58, 94);         // y[186,280]，不碰格子(顶183.5)/note(281)
}

void hopBoxOne(int src, int dst, double y, int below,
               double& x1, double& y1, double& x2, double& y2) {
    double yEdge = below ? ROWY - 36 : ROWY + 36;
    double a = cx(src), b = cx(dst);
    x1 = (a < b ? a : b) - 9; x2 = (a < b ? b : a) + 9;
    double lo = y < yEdge ? y : yEdge, hi = y < yEdge ? yEdge : y;
    y1 = lo - 2; y2 = hi + 2;
}

void draw() {
    if (!staticsDone) {
        drawStatic();
        for (int i = 0; i < N; i++) { lastCol[i] = -99; lastVal[i] = -99999; }
        lastNote[0] = lastNote2[0] = lastBig[0] = lastResult[0] = 0;
        lastLabA[0] = lastLabB[0] = 0;
        staticsDone = 1;
    }
    lineL(note, lastNote, -350, 292, 754, 22, 8, 16);
    for (int i = 0; i < N; i++) {
        int col;
        if (mode == 0 && pA >= 0) col = (i > pA) ? 8 : 2;   // 读指针右边还没读到
        else col = (i < activeN) ? 2 : 8;
        if (done[i]) col = 3;
        if (i == pA || i == pB) col = 5;
        if (col == lastCol[i] && a[i] == lastVal[i]) continue;
        wipe(cx(i), ROWY, 60, 68);         // y[116,184]，含格内下标标签
        pen.pu().moveTo(cx(i), ROWY).pd().c(col).size(3).r(CW, 64);
        int tc = (col == 8) ? 8 : 0;
        pen.pu().moveTo(cx(i), ROWY + 8).pd().c(tc).text(a[i], tc, 22);
        pen.pu().moveTo(cx(i), ROWY - 22).pd().c(8).text(i, 8, 12);
        lastCol[i] = col; lastVal[i] = a[i];
    }
    if (pA != lastPA || belowA != lastBelowA || strcmp(labA, lastLabA) != 0) {
        ptrSlot(lastPA, lastBelowA);
        ptr(pA, labA, belowA, 11);
        lastPA = pA; lastBelowA = belowA; strcpy(lastLabA, labA);
    }
    if (pB != lastPB || belowB != lastBelowB || strcmp(labB, lastLabB) != 0) {
        ptrSlot(lastPB, lastBelowB);
        ptr(pB, labB, belowB, 14);
        lastPB = pB; lastBelowB = belowB; strcpy(lastLabB, labB);
    }
    // hop 与 hop2 合并成一个槽：反转时两条红线共用上方带，必须一起擦一起画
    if (hopSrc != lastHopSrc || hopDst != lastHopDst || hopY != lastHopY ||
        hopBelow != lastHopBelow || hop2Src != lastHop2Src || hop2Dst != lastHop2Dst) {
        if (lastHopOn) wipe((lhx1 + lhx2) / 2, (lhy1 + lhy2) / 2, lhx2 - lhx1, lhy2 - lhy1);
        int h1 = (hopSrc >= 0 && hopDst >= 0), h2 = (hop2Src >= 0 && hop2Dst >= 0);
        if (h1 || h2) {
            double x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9, a1, b1, a2, b2;
            if (h1) {
                hopBoxOne(hopSrc, hopDst, hopY, hopBelow, a1, b1, a2, b2);
                if (a1 < x1) x1 = a1; if (b1 < y1) y1 = b1;
                if (a2 > x2) x2 = a2; if (b2 > y2) y2 = b2;
            }
            if (h2) {
                hopBoxOne(hop2Src, hop2Dst, 246, 0, a1, b1, a2, b2);
                if (a1 < x1) x1 = a1; if (b1 < y1) y1 = b1;
                if (a2 > x2) x2 = a2; if (b2 > y2) y2 = b2;
            }
            lhx1 = x1; lhy1 = y1; lhx2 = x2; lhy2 = y2; lastHopOn = 1;
        } else lastHopOn = 0;
        hop(hopSrc, hopDst, hopY, hopBelow, 1);
        hop(hop2Src, hop2Dst, 246, 0, 1);
        lastHopSrc = hopSrc; lastHopDst = hopDst; lastHopY = hopY; lastHopBelow = hopBelow;
        lastHop2Src = hop2Src; lastHop2Dst = hop2Dst;
    }
    if (strcmp(big, lastBig) != 0) {
        wipe(0, -70, 760, 34);
        pen.pu().moveTo(0, -70).pd().c(1).text(big, 1, 24);
        strcpy(lastBig, big);
    }
    lineL(note2, lastNote2, -350, -20, 754, 24, 0, 16);
    lineL(result, lastResult, -350, -200, 754, 26, 10, 18);
}

// ① 去重：慢指针写、快指针读（逻辑与原版逐字一致，只多了画图）
int dedup(int arr[], int n) {
    if (n == 0) return 0;
    int w = 1;
    done[0] = 1;
    for (int r = 1; r < n; ++r) {
        pA = r; pB = w - 1;
        snprintf(labA, sizeof labA, "r=%d", r);
        snprintf(labB, sizeof labB, "w-1=%d", w - 1);
        if (arr[r] != arr[w - 1]) {
            snprintf(big, sizeof big, "a[%d]=%d != a[%d]=%d", r, arr[r], w - 1, arr[w - 1]);
            snprintf(note2, sizeof note2, "新值：搬到 a[%d]，写指针 w 前进一格", w);
            hopSrc = r; hopDst = w; hopY = 84; hopBelow = 1;
            draw(); wait(0.07);
            arr[w++] = arr[r];
            done[w - 1] = 1;
            hopSrc = hopDst = -1;
            draw(); wait(0.05);
        } else {
            snprintf(big, sizeof big, "a[%d]=%d == a[%d]=%d", r, arr[r], w - 1, arr[w - 1]);
            snprintf(note2, sizeof note2, "重复值：跳过，w 不动，只有 r 前进");
            draw(); wait(0.07);
        }
    }
    return w;
}

// ② 两数之和：有序数组，和太大就右指针左移
bool twoSum(const int arr[], int n, int target, int& i, int& j) {
    int l = 0, r = n - 1;
    while (l < r) {
        int s = arr[l] + arr[r];
        pA = l; pB = r;
        snprintf(labA, sizeof labA, "l=%d", l);
        snprintf(labB, sizeof labB, "r=%d", r);
        snprintf(big, sizeof big, "%d + %d = %d（target %d）", arr[l], arr[r], s, target);
        if (s == target) {
            i = l; j = r;
            done[l] = 1; done[r] = 1;
            snprintf(note2, sizeof note2, "命中！下标 %d 和 %d，指针不用再动", l, r);
            draw(); wait(0.35);
            return true;
        }
        if (s < target) snprintf(note2, sizeof note2, "和偏小：左指针右移，让和变大");
        else snprintf(note2, sizeof note2, "和偏大：右指针左移，让和变小");
        draw(); wait(0.16);
        if (s < target) ++l; else --r;
    }
    return false;
}

// ③ 反转：两个指针往中间走，碰头一次交换一对
void reverseArr(int arr[], int n) {
    for (int l = 0, r = n - 1; l < r; ++l, --r) {
        pA = l; pB = r;
        snprintf(labA, sizeof labA, "l=%d", l);
        snprintf(labB, sizeof labB, "r=%d", r);
        snprintf(big, sizeof big, "交换 a[%d]=%d 与 a[%d]=%d", l, arr[l], r, arr[r]);
        snprintf(note2, sizeof note2, "两条红箭头 = 两个元素互换位置");
        hopSrc = l; hopDst = r; hopY = 214; hopBelow = 0;
        hop2Src = r; hop2Dst = l;
        draw(); wait(0.12);
        int t = arr[l]; arr[l] = arr[r]; arr[r] = t;
        done[l] = 1; done[r] = 1;
        hopSrc = hopDst = hop2Src = hop2Dst = -1;
        draw(); wait(0.1);
    }
}

int main() {
    pen.speed(10);
    char buf[100];
    snprintf(note, sizeof note, "① 去重：有序数组，慢指针 w 写、快指针 r 读");
    snprintf(note2, sizeof note2, "只用两个下标，额外空间 O(1)，不开新数组");
    listStr(buf, sizeof buf, N);
    snprintf(result, sizeof result, "原数组 12 个：%s", buf);
    draw(); wait(0.4);

    int k = dedup(a, N);
    pA = pB = -1; activeN = k;
    for (int i = 0; i < N; i++) done[i] = (i < k) ? 1 : 0;
    listStr(buf, sizeof buf, k);
    snprintf(note, sizeof note, "① 去重完成：长度 k=%d，后面 %d 格是残留数据", k, N - k);
    snprintf(big, sizeof big, "k = %d", k);
    snprintf(note2, sizeof note2, "有效区间只有 a[0..%d]，灰格子不再看", k - 1);
    snprintf(result, sizeof result, "去重后 k=%d：%s", k, buf);
    draw(); wait(0.4);

    mode = 1; belowA = belowB = 0;
    for (int i = 0; i < N; i++) done[i] = 0;
    snprintf(note, sizeof note, "② 两数之和：在有序的前 k 个里找和为 9 的一对");
    snprintf(note2, sizeof note2, "左右指针往中间夹，每步排除一个下标");
    draw(); wait(0.3);
    int i = -1, j = -1;
    bool ok = twoSum(a, k, 9, i, j);
    if (ok) snprintf(result, sizeof result, "和为 9：a[%d]=%d 与 a[%d]=%d", i, a[i], j, a[j]);
    else snprintf(result, sizeof result, "没找到和为 9 的一对");
    draw(); wait(0.25);

    mode = 2; belowA = belowB = 1;
    for (int t = 0; t < N; t++) done[t] = 0;
    snprintf(note, sizeof note, "③ 反转：l、r 往中间走，每走一步交换一对");
    snprintf(note2, sizeof note2, "指针画到格子下方，上面留给交换箭头");
    draw(); wait(0.3);
    reverseArr(a, k);
    pA = pB = -1;
    listStr(buf, sizeof buf, k);
    snprintf(result, sizeof result, "反转后：%s", buf);
    snprintf(note, sizeof note, "三个套路都只扫一遍：O(n) 时间、O(1) 额外空间");
    snprintf(big, sizeof big, "k=%d，和为 9 的下标 %d 与 %d", k, i, j);
    snprintf(note2, sizeof note2, "l 与 r 相遇时反转结束，绿格 = 已就位");
    draw(); wait(0.45);
    printf("去重 k=%d；两数之和 9 -> 下标 %d 和 %d；反转后 %s\\n", k, i, j, buf);
    return 0;
}
`,
  },
  '前缀和与差分数组（画图版）': {
    group: 'GoC 可视化·数组技巧',
    stdin: '',
    code: `// 前缀和与差分数组：上排原数组 a，中排前缀和 pre，下排差分 d，最下面一排是还原结果。
// 颜色：黄 = 正在递推 / 正在修改的格子，绿 = 已经算好的格子，灰 = 还没算到的空格子，
//       橙框 = 这次区间加覆盖的范围，绿框 = 要求和的那一段。
// 蓝箭头 = 加上 a[i]，紫箭头 = 继承 pre[i]（从格子下面绕过去）。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int n = 8;
int a[8] = {2, 5, 1, 7, 3, 6, 4, 8};
int pre[9], d[10], back[8];
int preDone = 0, dDone = 0, backDone = 0;   // 每排已经算出几个
int hiA = -1, hiA2 = -1, hiP = -1, hiP2 = -1;
int hiD = -1, hiD2 = -1, hiB = -1;
int opL = -1, opR = -1, opV = 0;            // 正在做的区间加
int sumL = -1, sumR = -1;                   // 正在求和的区间
int stage = 0;                              // 1 前缀递推 2 建差分 3 区间加 4 还原
char note[160], note2[160];

const double AY = 200, PY = 70, DY = -60, BY = -190;
double cx(int i) { return -264 + 66 * i; }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrowHead(double x, double y, double ang, double len, double w) {
    seg(x, y, x + len * sin_deg(ang + 150), y + len * cos_deg(ang + 150), w);
    seg(x, y, x + len * sin_deg(ang - 150), y + len * cos_deg(ang - 150), w);
}

void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 11, w);
}

// 区间框：罩住 a[l..r]，上面写一句话
void bracket(int l, int r, const char* label, int col) {
    double x1 = cx(l) - 30, x2 = cx(r) + 30;
    pen.c(col);
    seg(x1, AY + 36, x2, AY + 36, 3);
    seg(x1, AY + 36, x1, AY + 28, 3);
    seg(x2, AY + 36, x2, AY + 28, 3);
    pen.pu().moveTo((x1 + x2) / 2, AY + 52).pd().c(col).text(label, col, 16);
}

// ---- 局部重绘基础设施（格子是空心 r，箭头/框压在格子边上，需要脏传播）----
int staticsDone = 0;
double rowY[4] = {AY, PY, DY, BY};
int rowCnt[4] = {8, 9, 9, 8};
int lastCol[4][9], lastFill[4][9], lastVal[4][9];
int l_s1 = 0, l_s1A = -1, l_s1P = -1, l_s1P2 = -1;
int l_sumOn = 0, l_sumL = -1, l_sumR = -1;
int l_opOn = 0, l_opL = -1, l_opR = -1, l_opV = 0;
int l_s4 = 0, l_s4D = -1, l_s4B = -1;
double Lb1[4], Lb2[4], Lsm[4], Lop[4], Lol[4], Ls4[4];
char lastNote[160], lastNote2[160];
double rx1[64], ry1[64], rx2[64], ry2[64]; int rn = 0;

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                   // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}
void wipeMark(double x, double y, double w, double h) {
    wipe(x, y, w, h);
    if (rn < 64) {
        rx1[rn] = x - w / 2; ry1[rn] = y - h / 2;
        rx2[rn] = x + w / 2; ry2[rn] = y + h / 2; rn++;
    }
}
int hit(double x1, double y1, double x2, double y2) {
    for (int k = 0; k < rn; k++)
        if (x1 <= rx2[k] && x2 >= rx1[k] && y1 <= ry2[k] && y2 >= ry1[k]) return 1;
    return 0;
}
void wipeBox(double* b) { wipeMark((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, b[2] - b[0], b[3] - b[1]); }
int hitBox(double* b) { return hit(b[0], b[1], b[2], b[3]); }
void copyBox(double* d, double* s) { d[0] = s[0]; d[1] = s[1]; d[2] = s[2]; d[3] = s[3]; }
void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}
void drawStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).textL("前缀和与差分数组", 0, 26);
    pen.pu().moveTo(-378, AY).pd().c(0).textL("a[i]", 0, 16);
    pen.pu().moveTo(-378, PY).pd().c(0).textL("pre[i]", 0, 16);
    pen.pu().moveTo(-378, DY).pd().c(0).textL("d[i]", 0, 16);
    pen.pu().moveTo(-378, BY).pd().c(0).textL("还原", 0, 16);
    pen.pu().moveTo(-350, -292).pd().c(10).textL("前缀和：区间和 = 一次相减；差分：区间加 = 只改两端", 10, 15);
}
void cellBox(int r, int i, double* b) {
    b[0] = cx(i) - 30; b[2] = cx(i) + 30; b[1] = rowY[r] - 29; b[3] = rowY[r] + 29;
}
void drawCell(int r, int i, int col, int fill, int val) {
    pen.pu().moveTo(cx(i), rowY[r]).pd().c(col).size(3).r(56, 52);
    if (fill) pen.pu().moveTo(cx(i), rowY[r] + 7).pd().c(0).text(val, 0, 20);
    pen.pu().moveTo(cx(i), rowY[r] - 18).pd().c(8).text(i, 8, 11);
}

void draw() {
    if (!staticsDone) {
        drawStatic();
        for (int r = 0; r < 4; r++)
            for (int i = 0; i < 9; i++) { lastCol[r][i] = -99; lastFill[r][i] = -1; lastVal[r][i] = -99999; }
        lastNote[0] = lastNote2[0] = 0;
        staticsDone = 1;
    }
    rn = 0;
    lineL(note, lastNote, -350, 292, 754, 22, 8, 16);
    int* rv[4] = {a, pre, d, back};
    int rfill[4] = {8, preDone, dDone, backDone};
    int rbase[4] = {2, 3, 3, 3};
    int rh1[4] = {hiA, hiP, hiD, hiB};
    int rh2[4] = {hiA2, hiP2, hiD2, -1};
    int nowCol[4][9], nowFill[4][9], ch[4][9];
    for (int r = 0; r < 4; r++)
        for (int i = 0; i < rowCnt[r]; i++) {
            int col = (i < rfill[r]) ? rbase[r] : 8;
            if (i == rh1[r] || i == rh2[r]) col = 5;
            nowCol[r][i] = col; nowFill[r][i] = (i < rfill[r]) ? 1 : 0;
            ch[r][i] = (col != lastCol[r][i] || nowFill[r][i] != lastFill[r][i] ||
                        (nowFill[r][i] && rv[r][i] != lastVal[r][i])) ? 1 : 0;
        }
    // 当前覆盖物及其 bbox
    int s1 = (stage == 1 && hiA >= 0 && hiP >= 0 && hiP2 >= 0) ? 1 : 0;
    double cB1[4] = {0,0,0,0}, cB2[4] = {0,0,0,0};
    if (s1) {
        double xs = cx(hiA) + 18, xe = cx(hiP2) - 10;
        cB1[0] = (xs < xe ? xs : xe) - 12; cB1[2] = (xs < xe ? xe : xs) + 12;
        cB1[1] = PY + 23; cB1[3] = AY - 23;
        double pa = cx(hiP), pb = cx(hiP2);
        cB2[0] = (pa < pb ? pa : pb) - 7; cB2[2] = (pa < pb ? pb : pa) + 7;
        cB2[1] = PY - 50; cB2[3] = PY - 24;
    }
    int sumOn = (sumL >= 0) ? 1 : 0;
    double cSm[4] = {0,0,0,0};
    if (sumOn) { cSm[0] = cx(sumL) - 32; cSm[2] = cx(sumR) + 32; cSm[1] = AY + 26; cSm[3] = AY + 62; }
    int opOn = (opL >= 0) ? 1 : 0;
    double cOp[4] = {0,0,0,0}, cOl[4] = {0,0,0,0};
    if (opOn) {
        cOp[0] = cx(opL) - 32; cOp[2] = cx(opR) + 32; cOp[1] = AY + 26; cOp[3] = AY + 62;
        double la = cx(opL), lb = cx(opR + 1);
        cOl[0] = (la < lb ? la : lb) - 18; cOl[2] = (la < lb ? lb : la) + 18;
        cOl[1] = DY - 50; cOl[3] = DY - 30;
    }
    int s4 = (stage == 4 && hiD >= 0 && hiB >= 0) ? 1 : 0;
    double cS4[4] = {0,0,0,0};
    if (s4) { double x = cx(hiD); cS4[0] = x - 8; cS4[2] = x + 8; cS4[1] = BY + 24; cS4[3] = DY - 24; }
    int s1ch = (s1 != l_s1 || (s1 && (hiA != l_s1A || hiP != l_s1P || hiP2 != l_s1P2))) ? 1 : 0;
    int sumCh = (sumL != l_sumL || sumR != l_sumR) ? 1 : 0;
    int opCh = (opL != l_opL || opR != l_opR || opV != l_opV) ? 1 : 0;
    int s4ch = (s4 != l_s4 || (s4 && (hiD != l_s4D || hiB != l_s4B))) ? 1 : 0;

    // ① 先擦所有变化的槽（格子 + 覆盖物旧位置），记录擦除矩形
    for (int r = 0; r < 4; r++)
        for (int i = 0; i < rowCnt[r]; i++)
            if (ch[r][i]) { double b[4]; cellBox(r, i, b); wipeBox(b); }
    if (s1ch && l_s1) { wipeBox(Lb1); wipeBox(Lb2); }
    if (sumCh && l_sumOn) wipeBox(Lsm);
    if (opCh && l_opOn) { wipeBox(Lop); wipeBox(Lol); }
    if (s4ch && l_s4) wipeBox(Ls4);

    // ② 重画变化或被擦到的格子（不再擦）
    for (int r = 0; r < 4; r++)
        for (int i = 0; i < rowCnt[r]; i++) {
            double b[4]; cellBox(r, i, b);
            if (ch[r][i] || hitBox(b)) {
                drawCell(r, i, nowCol[r][i], nowFill[r][i], rv[r][i]);
                lastCol[r][i] = nowCol[r][i]; lastFill[r][i] = nowFill[r][i]; lastVal[r][i] = rv[r][i];
            }
        }

    // ③ 重画变化或被擦到的覆盖物
    if (s1) {
        if (s1ch || hitBox(cB1) || hitBox(cB2)) {
            arrow(cx(hiA) + 18, AY - 26, cx(hiP2) - 10, PY + 26, 3, 2);
            pen.c(11);
            seg(cx(hiP), PY - 26, cx(hiP), PY - 48, 3);
            seg(cx(hiP), PY - 48, cx(hiP2), PY - 48, 3);
            seg(cx(hiP2), PY - 48, cx(hiP2), PY - 26, 3);
            arrowHead(cx(hiP2), PY - 26, 0, 11, 3);
            copyBox(Lb1, cB1); copyBox(Lb2, cB2);
        }
        l_s1 = 1; l_s1A = hiA; l_s1P = hiP; l_s1P2 = hiP2;
    } else { l_s1 = 0; l_s1A = l_s1P = l_s1P2 = -1; }
    if (sumOn) {
        if (sumCh || hitBox(cSm)) { bracket(sumL, sumR, "a[2..5] = pre[6] - pre[2]", 3); copyBox(Lsm, cSm); }
        l_sumOn = 1; l_sumL = sumL; l_sumR = sumR;
    } else { l_sumOn = 0; l_sumL = l_sumR = -1; }
    if (opOn) {
        if (opCh || hitBox(cOp) || hitBox(cOl)) {
            char t[64];
            snprintf(t, sizeof t, "[%d,%d] 加 %d", opL, opR, opV);
            bracket(opL, opR, t, 14);
            snprintf(t, sizeof t, "%+d", opV);
            pen.pu().moveTo(cx(opL), DY - 40).pd().c(1).text(t, 1, 16);
            snprintf(t, sizeof t, "%+d", -opV);
            pen.pu().moveTo(cx(opR + 1), DY - 40).pd().c(1).text(t, 1, 16);
            copyBox(Lop, cOp); copyBox(Lol, cOl);
        }
        l_opOn = 1; l_opL = opL; l_opR = opR; l_opV = opV;
    } else { l_opOn = 0; l_opL = l_opR = -1; l_opV = 0; }
    if (s4) {
        if (s4ch || hitBox(cS4)) { arrow(cx(hiD), DY - 26, cx(hiB), BY + 26, 3, 11); copyBox(Ls4, cS4); }
        l_s4 = 1; l_s4D = hiD; l_s4B = hiB;
    } else { l_s4 = 0; l_s4D = l_s4B = -1; }

    lineL(note2, lastNote2, -350, -258, 754, 22, 0, 16);
}

int main() {
    pen.speed(10);
    memset(d, 0, sizeof d);
    pre[0] = 0; preDone = 1;
    snprintf(note, sizeof note, "① 前缀和：pre[0]=0，pre[i+1] = pre[i] + a[i]");
    snprintf(note2, sizeof note2, "蓝箭头 = 加上 a[i]，紫箭头 = 继承 pre[i]");
    draw(); wait(0.4);

    stage = 1;
    for (int i = 0; i < n; ++i) {
        pre[i + 1] = pre[i] + a[i];
        preDone = i + 2;
        hiA = i; hiP = i; hiP2 = i + 1;
        snprintf(note2, sizeof note2, "pre[%d] = pre[%d] + a[%d] = %d + %d = %d",
                 i + 1, i, i, pre[i], a[i], pre[i + 1]);
        draw(); wait(0.09);
    }
    hiA = hiP = hiP2 = -1; stage = 0;
    sumL = 2; sumR = 5; hiP = 2; hiP2 = 6;
    snprintf(note, sizeof note, "② 区间和：a[2..5] = pre[6] - pre[2]，一次相减");
    snprintf(note2, sizeof note2, "pre[6] - pre[2] = %d - %d = %d", pre[6], pre[2], pre[6] - pre[2]);
    draw(); wait(0.5);
    sumL = sumR = -1; hiP = hiP2 = -1;

    stage = 2;
    d[0] = a[0]; dDone = 1; hiA = 0; hiD = 0;
    snprintf(note, sizeof note, "③ 差分：d[i] = a[i] - a[i-1]，d[0] = a[0]");
    snprintf(note2, sizeof note2, "d[0] = a[0] = %d", a[0]);
    draw(); wait(0.12);
    for (int i = 1; i < n; ++i) {
        d[i] = a[i] - a[i - 1];
        dDone = i + 1;
        hiA = i - 1; hiA2 = i; hiD = i;
        snprintf(note2, sizeof note2, "d[%d] = a[%d] - a[%d] = %d - %d = %d",
                 i, i, i - 1, a[i], a[i - 1], d[i]);
        draw(); wait(0.07);
    }
    hiA = hiA2 = hiD = -1; dDone = 9;
    snprintf(note2, sizeof note2, "d[8]=0 是哨兵：区间右端 +1 最多落到这里");
    draw(); wait(0.2);

    stage = 3;
    int ops[3][3] = {{1, 4, 10}, {3, 6, 5}, {0, 2, -2}};
    for (int k = 0; k < 3; ++k) {
        int l = ops[k][0], r = ops[k][1], v = ops[k][2];
        opL = l; opR = r; opV = v; hiD = l; hiD2 = r + 1;
        snprintf(note, sizeof note, "④ 区间加 [%d,%d] 加 %d：只改差分两端", l, r, v);
        snprintf(note2, sizeof note2, "d[%d] += %d，d[%d] -= %d，中间一格都不动", l, v, r + 1, v);
        draw(); wait(0.16);
        d[l] += v; d[r + 1] -= v;
        draw(); wait(0.14);
    }
    opL = opR = -1; hiD = hiD2 = -1;

    stage = 4;
    snprintf(note, sizeof note, "⑤ 还原：对差分再做一遍前缀和就是改完的数组");
    int cur = 0;
    for (int i = 0; i < n; ++i) {
        cur += d[i]; back[i] = cur; backDone = i + 1;
        hiD = i; hiB = i;
        snprintf(note2, sizeof note2, "cur += d[%d] = %d，得到 a[%d] = %d", i, d[i], i, cur);
        draw(); wait(0.07);
    }
    hiD = hiB = -1;
    // 逐项核对（与原版一致）
    int bad = 0;
    for (int i = 0; i < n; ++i) {
        int v = a[i];
        for (int k = 0; k < 3; ++k)
            if (i >= ops[k][0] && i <= ops[k][1]) v += ops[k][2];
        if (v != back[i]) ++bad;
    }
    snprintf(note, sizeof note, "还原完毕，与逐项核对%s", bad ? "不一致" : "完全一致");
    snprintf(note2, sizeof note2, "m 次区间加只要 O(m+n)，比每次循环加 O(mn) 快");
    draw(); wait(0.45);
    printf("pre[8]=%d，a[2..5]=%d，三次区间加后还原：", pre[8], pre[6] - pre[2]);
    for (int i = 0; i < n; ++i) printf("%d ", back[i]);
    printf("\\n");
    return 0;
}
`,
  },
  '滑动窗口：定长最大和与最短子数组（画图版）': {
    group: 'GoC 可视化·数组技巧',
    stdin: '',
    code: `// 滑动窗口：橙色矩形就是窗口，窗口逐帧右移 / 收缩。
// 颜色：黄 = 当前窗口里的元素，红 = 这一步刚进窗，灰 = 这一步刚出窗，
//       绿 = 已经记录下来的最优窗口（定长最大和 / 变长最短子数组）。
// 下半部分：定长阶段画各个窗口和的柱子（最高的一根标绿），变长阶段显示当前最短长度。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 10;
int a[N] = {2, 3, 5, 1, 6, 4, 8, 2, 7, 3};
const int K = 3, target = 15;
const double PITCH = 70, CW = 62, ROWY = 150;

int wl = -1, wr = -1;          // 窗口左右端
int phase = 0;                 // 0 定长最大和 1 变长最短子数组
int sum = 0, best = 0, bestL = -1;
int cur = 0, minLen = N + 1, ansL = -1;
int hist[N], histN = 0, histBest = -1;
int enterIdx = -1, leaveIdx = -1;
char note[160], note2[160], statLine[160];   // 别叫 stat：libc 里有同名函数，链接会撞

double cx(int i) { return -(N * PITCH - 8) / 2 + i * PITCH + CW / 2; }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void statFixed() {
    snprintf(statLine, sizeof statLine, "sum = %d    best = %d（起点下标 %d）", sum, best, bestL);
}

void statVar() {
    char ml[24];
    if (minLen > N) snprintf(ml, sizeof ml, "无");
    else snprintf(ml, sizeof ml, "%d", minLen);
    snprintf(statLine, sizeof statLine, "cur = %d    target = %d    minLen = %s", cur, target, ml);
}

// ---- 局部重绘基础设施（窗口框压在格子边上，需要脏传播）----
int staticsDone = 0, lastPhase = -1;
int lastCol[N], lastVal[N];
int lastFrameType = 0, lastFL = 0, lastFR = 0; double LF[4];
int barVal[N], barCol[N], lastHistN = 0;
char lastNote[160], lastNote2[160], lastStat[160], lastVar[160];
double rx1[40], ry1[40], rx2[40], ry2[40]; int rn = 0;

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                   // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}
void wipeMark(double x, double y, double w, double h) {
    wipe(x, y, w, h);
    if (rn < 40) {
        rx1[rn] = x - w / 2; ry1[rn] = y - h / 2;
        rx2[rn] = x + w / 2; ry2[rn] = y + h / 2; rn++;
    }
}
int hit(double x1, double y1, double x2, double y2) {
    for (int k = 0; k < rn; k++)
        if (x1 <= rx2[k] && x2 >= rx1[k] && y1 <= ry2[k] && y2 >= ry1[k]) return 1;
    return 0;
}
void wipeBox(double* b) { wipeMark((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, b[2] - b[0], b[3] - b[1]); }
int hitBox(double* b) { return hit(b[0], b[1], b[2], b[3]); }
void copyBox(double* d, double* s) { d[0] = s[0]; d[1] = s[1]; d[2] = s[2]; d[3] = s[3]; }
void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}
void drawSharedStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).textL("滑动窗口：定长最大和与最短子数组", 0, 26);
    pen.pu().moveTo(-350, -318).pd().c(8).textL("黄 = 当前窗口    红 = 刚进窗    灰 = 刚出窗    绿 = 最优", 8, 14);
}
void drawPhaseStatic(int ph) {
    if (ph == 0) {
        pen.pu().moveTo(-350, -96).pd().c(0).textL("各个定长窗口的和（k=3，绿柱 = 最大）", 0, 16);
        pen.c(8);
        seg(-250, -266, 250, -266, 3);   // 地平线下移到柱槽之外
    } else {
        pen.pu().moveTo(-350, -110).pd().c(0).textL("变长窗口：右端一直扩张，和 >= target 才收缩左端", 0, 17);
        pen.pu().moveTo(-350, -192).pd().c(8).textL("绿格 = 记录下来的最短子数组，黄格 = 当前窗口", 8, 16);
        pen.pu().moveTo(-350, -228).pd().c(8).textL("每个元素最多进窗一次、出窗一次，总复杂度 O(n)", 8, 16);
    }
}

void draw() {
    if (!staticsDone) {
        drawSharedStatic();
        for (int i = 0; i < N; i++) { lastCol[i] = -99; lastVal[i] = -99999; barVal[i] = -99999; barCol[i] = -99; }
        lastNote[0] = lastNote2[0] = lastStat[0] = lastVar[0] = 0;
        staticsDone = 1; lastPhase = -1;
    }
    if (phase != lastPhase) {          // 一次性切换下半屏：擦整条带，重画该阶段静态
        wipe(0, -185, 800, 210);       // y[-290,-80]
        drawPhaseStatic(phase);
        for (int i = 0; i < N; i++) { barVal[i] = -99999; barCol[i] = -99; }
        lastHistN = 0; lastVar[0] = 0;
        lastPhase = phase;
    }
    rn = 0;
    lineL(note, lastNote, -350, 292, 754, 22, 8, 16);
    int nowCol[N], ch[N];
    for (int i = 0; i < N; i++) {
        int col = 2;
        if (phase == 0 && bestL >= 0 && i >= bestL && i < bestL + K) col = 3;
        if (phase == 1 && ansL >= 0 && i >= ansL && i < ansL + minLen) col = 3;
        if (wl >= 0 && i >= wl && i <= wr) col = 5;
        if (i == enterIdx) col = 1;
        if (i == leaveIdx) col = 8;
        nowCol[i] = col;
        ch[i] = (col != lastCol[i] || a[i] != lastVal[i]) ? 1 : 0;
    }
    // 当前窗口框（橙）或答案框（绿），二者互斥
    int ftype = 0, fl = 0, fr = 0;
    if (wl >= 0 && wr >= wl) { ftype = 1; fl = wl; fr = wr; }
    else if (phase == 1 && wl < 0 && ansL >= 0) { ftype = 2; fl = ansL; fr = ansL + minLen - 1; }
    double cF[4] = {0,0,0,0};
    if (ftype) {
        double center = (cx(fl) + cx(fr)) / 2;
        double lx = cx(fl) - 38, rx = cx(fr) + 38;
        cF[0] = (lx < center - 130 ? lx : center - 130);
        cF[2] = (rx > center + 130 ? rx : center + 130);
        cF[1] = 104; cF[3] = 222;      // 盖住框身 + 上方文字标签
    }
    int fch = (ftype != lastFrameType || fl != lastFL || fr != lastFR) ? 1 : 0;

    // ① 擦变化的格子 + 旧窗口框
    for (int i = 0; i < N; i++) if (ch[i]) wipeMark(cx(i), ROWY, 66, 66);
    if (fch && lastFrameType) wipeBox(LF);
    // ② 重画变化或被擦到的格子
    for (int i = 0; i < N; i++) {
        if (ch[i] || hit(cx(i) - 33, ROWY - 33, cx(i) + 33, ROWY + 33)) {
            pen.pu().moveTo(cx(i), ROWY).pd().c(nowCol[i]).size(3).r(CW, 60);
            int tc = (nowCol[i] == 8) ? 8 : 0;
            pen.pu().moveTo(cx(i), ROWY + 6).pd().c(tc).text(a[i], tc, 22);
            pen.pu().moveTo(cx(i), ROWY - 20).pd().c(8).text(i, 8, 12);
            lastCol[i] = nowCol[i]; lastVal[i] = a[i];
        }
    }
    // ③ 重画变化或被擦到的窗口框
    if (ftype) {
        if (fch || hitBox(cF)) {
            if (ftype == 1) {
                double x1 = cx(wl) - CW / 2 - 5, x2 = cx(wr) + CW / 2 + 5;
                pen.pu().moveTo((x1 + x2) / 2, ROWY).pd().c(14).size(4).r(x2 - x1, 88);
                char t[64];
                snprintf(t, sizeof t, "窗口 [%d..%d]，长度 %d", wl, wr, wr - wl + 1);
                pen.pu().moveTo((x1 + x2) / 2, ROWY + 62).pd().c(14).text(t, 14, 16);
            } else {
                double x1 = cx(ansL) - CW / 2 - 5, x2 = cx(ansL + minLen - 1) + CW / 2 + 5;
                pen.pu().moveTo((x1 + x2) / 2, ROWY).pd().c(3).size(4).r(x2 - x1, 88);
                pen.pu().moveTo((x1 + x2) / 2, ROWY + 62).pd().c(10).text("最短子数组", 10, 16);
            }
            copyBox(LF, cF);
        }
        lastFrameType = ftype; lastFL = fl; lastFR = fr;
    } else lastFrameType = 0;

    if (phase == 0) {
        double base = -260;
        for (int i = 0; i < histN; i++) {
            double x = -217 + 62 * i;
            double h = hist[i] / 20.0 * 120;
            int col = 2;
            if (i == histBest) col = 3;
            if (i == histN - 1) col = 5;
            int isNew = (i >= lastHistN) ? 1 : 0;
            if (isNew || hist[i] != barVal[i] || col != barCol[i]) {
                wipe(x, -186, 50, 156);    // y[-264,-108]，不碰地平线(-266)/下标(-276)/面板标题(-96)
                pen.pu().moveTo(x, base + h / 2).pd().c(col).size(3).rr(44, h);   // 底对齐
                pen.pu().moveTo(x, base + h + 14).pd().c(0).text(hist[i], 0, 15);
                if (isNew) pen.pu().moveTo(x, base - 16).pd().c(8).text(i, 8, 12);
                barVal[i] = hist[i]; barCol[i] = col;
            }
        }
        lastHistN = histN;
    } else {
        char t[160];
        if (ansL < 0) snprintf(t, sizeof t, "还没找到和 >= %d 的子数组", target);
        else snprintf(t, sizeof t, "当前最短：长度 %d，起点下标 %d", minLen, ansL);
        lineL(t, lastVar, -350, -152, 754, 28, 10, 20);
    }
    lineL(statLine, lastStat, -350, 40, 754, 28, 0, 20);
    lineL(note2, lastNote2, -350, 8, 754, 22, 10, 16);
}

int main() {
    pen.speed(10);
    // ① 定长 k=3 的最大和：先算头一个窗口，之后「加右端、减左端」
    snprintf(note, sizeof note, "① 定长 k=3 的最大和：窗口整体右移，加右端、减左端");
    for (int i = 0; i < K; ++i) sum += a[i];
    best = sum; bestL = 0;
    wl = 0; wr = K - 1;
    hist[histN++] = sum; histBest = 0;
    statFixed();
    snprintf(note2, sizeof note2, "先算头一个窗口 [0..2]，之后每步只加一个、减一个");
    draw(); wait(0.35);
    for (int r = K; r < N; ++r) {
        leaveIdx = r - K; enterIdx = r;
        sum += a[r] - a[r - K];
        wl = r - K + 1; wr = r;
        hist[histN++] = sum;
        if (sum > best) { best = sum; bestL = wl; histBest = histN - 1; }
        statFixed();
        snprintf(note2, sizeof note2, "sum += a[%d] - a[%d] = %d - %d", r, r - K, a[r], a[r - K]);
        draw(); wait(0.14);
    }
    enterIdx = leaveIdx = -1;
    snprintf(note2, sizeof note2, "最大窗口和 = %d，起点下标 %d（绿框那一窗口）", best, bestL);
    draw(); wait(0.4);

    // ② 变长：和 >= target 的最短子数组，右端扩张、左端收缩
    phase = 1; wl = wr = -1; cur = 0; minLen = N + 1; ansL = -1;
    snprintf(note, sizeof note, "② 变长：和 >= 15 的最短子数组，右端扩张、左端收缩");
    statVar();
    snprintf(note2, sizeof note2, "窗口长度不再固定，橙框会自己变宽变窄");
    draw(); wait(0.3);
    int l = 0;
    for (int r = 0; r < N; ++r) {
        cur += a[r];
        wl = l; wr = r; enterIdx = r; leaveIdx = -1;
        statVar();
        snprintf(note2, sizeof note2, "右端扩张：cur += a[%d] = %d", r, a[r]);
        draw(); wait(0.08);
        while (cur >= target) {
            if (r - l + 1 < minLen) { minLen = r - l + 1; ansL = l; }
            enterIdx = -1; leaveIdx = l;
            statVar();
            snprintf(note2, sizeof note2, "cur >= 15：记下长度 %d，再收缩左端", r - l + 1);
            draw(); wait(0.08);
            cur -= a[l++];
            wl = (l <= r) ? l : -1; wr = r;
        }
    }
    enterIdx = leaveIdx = -1;
    wl = wr = -1;                 // 收起当前窗口，让绿框把答案圈出来
    statVar();
    snprintf(note, sizeof note, "答案：最短长度 %d，起点下标 %d（绿框）", minLen, ansL);
    snprintf(note2, sizeof note2, "定长最大和 %d（起点 %d）；变长最短 %d（起点 %d）", best, bestL, minLen, ansL);
    draw(); wait(0.5);
    printf("定长 k=3 最大和 %d（起点 %d）；和>=%d 最短长度 %d（起点 %d）\\n",
           best, bestL, target, minLen, ansL);
    return 0;
}
`,
  },
  '静态链表（游标数组实现）（画图版）': {
    group: 'GoC 可视化·数组技巧',
    stdin: '',
    code: `// 静态链表（游标数组）：左下是「下标 | data | next」三列表格（32 格里画前 8 格），
// 上面一排是链表的逻辑顺序，右边是空闲链（备用节点）的分配与回收。
// 颜色：黄 = 正在改的格子 / 节点，绿 = 刚分配的新节点，红 = 被删除的节点，灰 = 空闲格。
// 红色折线箭头 = 这一次 next 的指向从哪一行改到哪一行。改 next 只是改一个整数。
#include <goc.h>
#include <cstdio>
#include <cstring>

struct StaticList {
    int val[32];
    int next[32];
    int freeHead;                 // 空闲节点链头
    int used;
    StaticList() : freeHead(0), used(0) {
        for (int i = 0; i < 31; ++i) next[i] = i + 1;
        next[31] = -1;
    }
    int alloc(int v) {
        if (freeHead == -1) return -1;   // 满了
        int p = freeHead;
        freeHead = next[p];
        val[p] = v; next[p] = -1; ++used;
        return p;
    }
    void release(int p) { next[p] = freeHead; freeHead = p; --used; }
};

StaticList L;
int head = -1, tail = -1;
int hiRow = -1, hiRow2 = -1;      // 表格里标黄的行
int newRow = -1, delRow = -1;     // 绿 / 红
int linkSrc = -1, linkDst = -1;   // 正在改的 next：从哪一行指向哪一行
int hiNode = -1;                  // 逻辑链上标黄的节点
int inList[32];
char note[160], note2[160];

const double TX = -372, C1 = 64, C2 = 80, C3 = 80;
const double HY = 116;
double rowY(int i) { return 74 - i * 44; }
double idxX() { return TX + C1 / 2; }
double datX() { return TX + C1 + C2 / 2; }
double nxtX() { return TX + C1 + C2 + C3 / 2; }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrowHead(double x, double y, double ang, double len, double w) {
    seg(x, y, x + len * sin_deg(ang + 150), y + len * cos_deg(ang + 150), w);
    seg(x, y, x + len * sin_deg(ang - 150), y + len * cos_deg(ang - 150), w);
}

void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 11, w);
}

// ---- 局部重绘基础设施 ----
int staticsDone = 0;
int lastCol[8], lastInList[8], lastVal[8], lastNext[8];
int lastLinkOn = 0, lastLinkSrc = -1, lastLinkDst = -1; double LL[4];
char lastTopSig[200], lastFreeSig[200];
char lastNote[160], lastNote2[160], lastFreeHead[80];
double rx1[24], ry1[24], rx2[24], ry2[24]; int rn = 0;

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                   // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}
void wipeMark(double x, double y, double w, double h) {
    wipe(x, y, w, h);
    if (rn < 24) {
        rx1[rn] = x - w / 2; ry1[rn] = y - h / 2;
        rx2[rn] = x + w / 2; ry2[rn] = y + h / 2; rn++;
    }
}
int hit(double x1, double y1, double x2, double y2) {
    for (int k = 0; k < rn; k++)
        if (x1 <= rx2[k] && x2 >= rx1[k] && y1 <= ry2[k] && y2 >= ry1[k]) return 1;
    return 0;
}
void wipeBox(double* b) { wipeMark((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, b[2] - b[0], b[3] - b[1]); }
int hitBox(double* b) { return hit(b[0], b[1], b[2], b[3]); }
void copyBox(double* d, double* s) { d[0] = s[0]; d[1] = s[1]; d[2] = s[2]; d[3] = s[3]; }
void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}
void drawStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).textL("静态链表（游标数组实现）", 0, 26);
    pen.pu().moveTo(idxX(), HY).pd().c(0).text("下标", 0, 15);
    pen.pu().moveTo(datX(), HY).pd().c(0).text("data", 0, 15);
    pen.pu().moveTo(nxtX(), HY).pd().c(0).text("next", 0, 15);
    pen.c(0);
    seg(TX, HY + 20, TX + C1 + C2 + C3, HY + 20, 2);
    pen.pu().moveTo(idxX(), rowY(8) + 10).pd().c(8).text("…", 8, 18);
    pen.pu().moveTo(-104, 116).pd().c(0).textL("空闲链（备用节点）", 0, 16);
    pen.pu().moveTo(-104, -26).pd().c(0).textL("next 存的是下标，-1 就是 NULL", 0, 15);
    const char* lg[4] = {"正在改", "新分配", "被删除", "空闲"};
    int lc[4] = {5, 3, 1, 8};
    for (int k = 0; k < 4; k++) {
        double x = -104 + (k % 2) * 150, y = -66 - (k / 2) * 34;
        pen.pu().moveTo(x, y).pd().c(lc[k]).size(3).r(16, 16);
        pen.pu().moveTo(x + 14, y).pd().c(0).textL(lg[k], 0, 14);
    }
    pen.pu().moveTo(-104, -156).pd().c(10).textL("alloc：p = freeHead，freeHead = next[p]", 10, 14);
    pen.pu().moveTo(-104, -186).pd().c(10).textL("release：next[p] = freeHead，freeHead = p", 10, 14);
    pen.pu().moveTo(-104, -216).pd().c(8).textL("数组共 32 格，这里只画前 8 格", 8, 14);
}
void rowBox(int i, double* b) {
    b[0] = -374; b[2] = -146; b[1] = rowY(i) - 22; b[3] = rowY(i) + 22;
}
void drawRowContent(int i, int col, int inList) {
    double y = rowY(i);
    pen.c(col).size(2);
    pen.pu().moveTo(idxX(), y).pd().r(C1, 38);
    pen.pu().moveTo(datX(), y).pd().r(C2, 38);
    pen.pu().moveTo(nxtX(), y).pd().r(C3, 38);
    pen.pu().moveTo(idxX(), y).pd().c(col).text(i, col, 16);
    if (inList) pen.pu().moveTo(datX(), y).pd().c(0).text(L.val[i], 0, 16);
    else pen.pu().moveTo(datX(), y).pd().c(8).text("-", 8, 16);
    int tc = (col == 8) ? 8 : 0;
    pen.pu().moveTo(nxtX(), y).pd().c(tc).text(L.next[i], tc, 16);
}
void drawTop(int cnt, int* chain) {
    if (cnt == 0) {
        pen.pu().moveTo(0, 210).pd().c(8).text("head = -1（空表）", 8, 20);
    } else {
        double pitch = 112, x0 = -(cnt - 1) * pitch / 2;
        char t[48];
        for (int i = 0; i < cnt; i++) {
            double x = x0 + i * pitch;
            int p = chain[i], col = 2;
            if (p == newRow) col = 3;
            if (p == delRow) col = 1;
            if (p == hiNode) col = 5;
            pen.pu().moveTo(x, 210).pd().c(col).size(3).r(66, 56);
            pen.pu().moveTo(x, 218).pd().c(0).text(L.val[p], 0, 22);
            snprintf(t, sizeof t, "下标 %d", p);
            pen.pu().moveTo(x, 194).pd().c(8).text(t, 8, 12);
            if (i + 1 < cnt) arrow(x + 33, 210, x + pitch - 33, 210, 3, 8);
            else {
                arrow(x + 33, 210, x + 52, 210, 3, 8);
                pen.pu().moveTo(x + 74, 210).pd().c(8).text("NULL", 8, 14);
            }
        }
        snprintf(t, sizeof t, "head = %d", head);
        pen.pu().moveTo(x0, 254).pd().c(11).text(t, 11, 15);
    }
}
void drawFree(int fn, int* fp) {
    for (int i = 0; i < fn; i++) {
        double x = -70 + i * 76;
        int col = 8;
        if (fp[i] == hiRow || fp[i] == hiRow2) col = 5;
        if (fp[i] == newRow) col = 3;
        pen.pu().moveTo(x, 30).pd().c(col).size(3).r(52, 40);
        pen.pu().moveTo(x, 30).pd().c(0).text(fp[i], 0, 18);
        if (i + 1 < fn) arrow(x + 26, 30, x + 50, 30, 3, 8);
    }
    if (fn > 0) {
        arrow(-70 + (fn - 1) * 76 + 26, 30, 210, 30, 3, 8);
        pen.pu().moveTo(248, 30).pd().c(8).text("… 31", 8, 16);
    }
}

void draw() {
    if (!staticsDone) {
        drawStatic();
        for (int i = 0; i < 8; i++) { lastCol[i] = -99; lastInList[i] = -1; lastVal[i] = -99999; lastNext[i] = -99999; }
        lastTopSig[0] = lastFreeSig[0] = 0;
        lastNote[0] = lastNote2[0] = lastFreeHead[0] = 0;
        staticsDone = 1;
    }
    lineL(note, lastNote, -350, 292, 754, 22, 8, 16);

    // 谁在链表里：顺着 head 走一遍
    for (int i = 0; i < 32; i++) inList[i] = 0;
    int chain[10], cnt = 0;
    for (int p = head; p != -1 && cnt < 10; p = L.next[p]) { inList[p] = 1; chain[cnt++] = p; }

    // 上排逻辑链：整条带由签名驱动，结构/颜色变了才擦带重画
    char topSig[200]; int tp = 0;
    tp += snprintf(topSig + tp, sizeof topSig - tp, "%d|%d|%d|%d|%d|", cnt, head, newRow, delRow, hiNode);
    for (int i = 0; i < cnt; i++) tp += snprintf(topSig + tp, sizeof topSig - tp, "%d,%d;", chain[i], L.val[chain[i]]);
    if (strcmp(topSig, lastTopSig) != 0) { wipe(0, 214, 800, 124); drawTop(cnt, chain); strcpy(lastTopSig, topSig); }

    // 右边空闲链：同样整条带签名驱动
    int fp[4], fn = 0;
    for (int p = L.freeHead; p != -1 && fn < 4; p = L.next[p]) fp[fn++] = p;
    char freeSig[200]; int fq = 0;
    fq += snprintf(freeSig + fq, sizeof freeSig - fq, "%d|%d|%d|%d|", fn, hiRow, hiRow2, newRow);
    for (int i = 0; i < fn; i++) fq += snprintf(freeSig + fq, sizeof freeSig - fq, "%d;", fp[i]);
    if (strcmp(freeSig, lastFreeSig) != 0) { wipe(85, 30, 370, 52); drawFree(fn, fp); strcpy(lastFreeSig, freeSig); }
    char ft[80];
    snprintf(ft, sizeof ft, "freeHead = %d    used = %d", L.freeHead, L.used);
    lineL(ft, lastFreeHead, -104, 84, 360, 24, 11, 16);

    // 左下表格：逐行脏跟踪；红色 next 折线压在表格右边，需要脏传播
    int nowCol[8], nowIn[8], ch[8];
    for (int i = 0; i < 8; i++) {
        int col = inList[i] ? 2 : 8;
        if (i == newRow) col = 3;
        if (i == delRow) col = 1;
        if (i == hiRow || i == hiRow2) col = 5;
        nowCol[i] = col; nowIn[i] = inList[i];
        ch[i] = (col != lastCol[i] || inList[i] != lastInList[i] ||
                 L.val[i] != lastVal[i] || L.next[i] != lastNext[i]) ? 1 : 0;
    }
    int linkOn = (linkSrc >= 0 && linkDst >= 0) ? 1 : 0;
    double cL[4] = {0,0,0,0};
    if (linkOn) {
        double y1 = rowY(linkSrc), y2 = rowY(linkDst);
        double lo = y1 < y2 ? y1 : y2, hi = y1 < y2 ? y2 : y1;
        cL[0] = -150; cL[2] = -122; cL[1] = lo - 8; cL[3] = hi + 8;
    }
    int linkCh = (linkOn != lastLinkOn || (linkOn && (linkSrc != lastLinkSrc || linkDst != lastLinkDst))) ? 1 : 0;
    rn = 0;
    // ① 擦变化的行 + 旧折线
    for (int i = 0; i < 8; i++) if (ch[i]) { double b[4]; rowBox(i, b); wipeBox(b); }
    if (linkCh && lastLinkOn) wipeBox(LL);
    // ② 重画变化或被擦到的行
    for (int i = 0; i < 8; i++) {
        double b[4]; rowBox(i, b);
        if (ch[i] || hitBox(b)) {
            drawRowContent(i, nowCol[i], nowIn[i]);
            lastCol[i] = nowCol[i]; lastInList[i] = nowIn[i]; lastVal[i] = L.val[i]; lastNext[i] = L.next[i];
        }
    }
    // ③ 重画变化或被擦到的折线
    if (linkOn) {
        if (linkCh || hitBox(cL)) {
            double y1 = rowY(linkSrc), y2 = rowY(linkDst), xr = TX + C1 + C2 + C3;
            pen.c(1);
            seg(xr, y1, -124, y1, 3);
            seg(-124, y1, -124, y2, 3);
            seg(-124, y2, xr + 2, y2, 3);
            arrowHead(xr + 2, y2, 270, 11, 3);
            copyBox(LL, cL);
        }
        lastLinkOn = 1; lastLinkSrc = linkSrc; lastLinkDst = linkDst;
    } else { lastLinkOn = 0; lastLinkSrc = lastLinkDst = -1; }

    lineL(note2, lastNote2, -350, -308, 754, 22, 0, 16);
}

int main() {
    pen.speed(10);
    snprintf(note, sizeof note, "初始：32 个格子全挂在空闲链上，head = -1");
    snprintf(note2, sizeof note2, "next[i] = i+1 把空闲格串成一条链，freeHead = 0");
    draw(); wait(0.45);

    // 尾插建表：1 11 21 31 41
    for (int i = 0; i < 5; ++i) {
        int v = i * 10 + 1;
        hiRow = L.freeHead;
        snprintf(note, sizeof note, "尾插 %d：alloc 从空闲链头拿一格", v);
        snprintf(note2, sizeof note2, "p = freeHead = %d，链头挪到 next[%d] = %d",
                 L.freeHead, L.freeHead, L.next[L.freeHead]);
        draw(); wait(0.1);
        int p = L.alloc(v);
        newRow = p; hiRow = -1;
        if (head == -1) {
            head = p;
            snprintf(note2, sizeof note2, "val[%d] = %d，空表所以 head = %d", p, v, p);
        } else {
            linkSrc = tail; linkDst = p;
            L.next[tail] = p;
            snprintf(note2, sizeof note2, "val[%d] = %d，尾节点 next[%d] 改成 %d", p, v, tail, p);
        }
        tail = p;
        draw(); wait(0.1);
        linkSrc = linkDst = -1; newRow = -1;
    }
    snprintf(note, sizeof note, "建好的链表：1 -> 11 -> 21 -> 31 -> 41");
    snprintf(note2, sizeof note2, "节点就是数组下标，head = %d，已用 %d 格", head, L.used);
    draw(); wait(0.35);

    // 在值为 21 的节点后插入 99
    hiRow = L.freeHead;
    snprintf(note, sizeof note, "插入：先 alloc 一个新格子放 99");
    snprintf(note2, sizeof note2, "p = freeHead = %d，空闲链头往后挪一格", L.freeHead);
    draw(); wait(0.14);
    int p = L.alloc(99);
    newRow = p; hiRow = -1;
    snprintf(note2, sizeof note2, "新格子下标 %d，next[%d] 先置 -1", p, p);
    draw(); wait(0.12);
    for (int q = head; q != -1; q = L.next[q]) {
        if (L.val[q] == 21) {
            hiNode = q; hiRow = q;
            linkSrc = p; linkDst = L.next[q];
            L.next[p] = L.next[q];
            snprintf(note, sizeof note, "找到值为 21 的节点（下标 %d）", q);
            snprintf(note2, sizeof note2, "先接后半段：next[%d] = next[%d] = %d", p, q, L.next[p]);
            draw(); wait(0.18);
            linkSrc = q; linkDst = p;
            L.next[q] = p;
            snprintf(note2, sizeof note2, "再让 21 指向新节点：next[%d] = %d", q, p);
            draw(); wait(0.18);
            break;
        }
    }
    linkSrc = linkDst = -1; hiNode = hiRow = newRow = -1;
    snprintf(note, sizeof note, "21 后面插入 99：只改两个 next，没搬动任何数据");
    snprintf(note2, sizeof note2, "链表顺序变了，数组里各格的位置一点没动");
    draw(); wait(0.3);

    // 删除值为 11 的节点，并把它归还空闲链
    int prev = -1;
    for (int q = head; q != -1; prev = q, q = L.next[q]) {
        if (L.val[q] == 11) {
            hiNode = q; delRow = q; hiRow = prev;
            linkSrc = prev; linkDst = L.next[q];
            if (prev == -1) head = L.next[q]; else L.next[prev] = L.next[q];
            snprintf(note, sizeof note, "删除 11（下标 %d），前驱是下标 %d", q, prev);
            snprintf(note2, sizeof note2, "让前驱绕过它：next[%d] = next[%d] = %d", prev, q, linkDst);
            draw(); wait(0.2);
            linkSrc = linkDst = -1;
            hiRow = q; hiRow2 = L.freeHead;
            snprintf(note2, sizeof note2, "release(%d)：next[%d] = %d，freeHead = %d",
                     q, q, L.freeHead, q);
            L.release(q);
            draw(); wait(0.2);
            break;
        }
    }
    delRow = hiRow = hiRow2 = hiNode = -1;
    snprintf(note, sizeof note, "删除后：1 -> 21 -> 99 -> 31 -> 41，下标 1 回到空闲链");
    snprintf(note2, sizeof note2, "已用 %d 格；回收的下标马上能被下一次 alloc 复用", L.used);
    draw(); wait(0.5);
    printf("建表 1 11 21 31 41；21 后插 99；删 11 后 used=%d，freeHead=%d\\n", L.used, L.freeHead);
    return 0;
}
`,
  },
  '二维数组：杨辉三角与螺旋遍历（画图版）': {
    group: 'GoC 可视化·数组技巧',
    stdin: '',
    code: `// 上半：杨辉三角逐行生成。黄格 = 正在相加的两个「肩膀」（上一行的左上、右上），
//       绿格 = 刚算出来的新格子，蓝框 = 已经生成好的格子，右边写这一行的和（2^i）。
// 下半：4x5 矩阵螺旋遍历。绿格 = 已访问，黄格 = 当前格子，橙线 = 走过的路径，
//       橙色细框 = 当前的 top/bottom/left/right 四个边界，格子左上角是访问序号。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int TN = 7;
int tri[7][7];
int showTri = -1;              // 已经画到第几行
int genRow = -1;               // 正在生成第几行
int hiJ1 = -1, hiJ2 = -1;      // 上一行的两个肩膀
int newJ = -1;                 // 本行刚算出的格子

const int R = 4, C = 5;
int m[4][5] = {{1, 2, 3, 4, 5},
               {6, 7, 8, 9, 10},
               {11, 12, 13, 14, 15},
               {16, 17, 18, 19, 20}};
int vis[4][5], order[4][5];
int pathR[20], pathC[20], pathN = 0;
int visited = 0, curR = -1, curC = -1;
int top = 0, bottom = R - 1, left = 0, right = C - 1;
int showSpiral = 0;
char note[160], note2[160], seq[200];

double tx(int i, int j) { return -25.0 * i + 50.0 * j; }
double ty(int i) { return 250 - 34.0 * i; }
double mcx(int c) { return -124 + 62.0 * c; }
double mcy(int r) { return -60 - 50.0 * r; }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrowHead(double x, double y, double ang, double len, double w) {
    seg(x, y, x + len * sin_deg(ang + 150), y + len * cos_deg(ang + 150), w);
    seg(x, y, x + len * sin_deg(ang - 150), y + len * cos_deg(ang - 150), w);
}

void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    arrowHead(x2, y2, atan2_deg(x2 - x1, y2 - y1), 9, w);
}

// ---- 局部重绘基础设施 ----
int staticsDone = 0;
int tCol[7][7], tFill[7][7], tVal[7][7], lastSum[7], lastShowTri = -1;
int lShOn = 0, lShG = -1, lShNJ = -1, lShJ1 = -1, lShJ2 = -1; double LSh[4];
int sCol[4][5], sFill[4][5], sVis[4][5];
int lBoundOn = 0, lTop = 0, lBottom = 0, lLeft = 0, lRight = 0;
char lastNote[160], lastNote2[160], lastSeq[240];
double rx1[40], ry1[40], rx2[40], ry2[40]; int rn = 0;

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                   // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}
void wipeMark(double x, double y, double w, double h) {
    wipe(x, y, w, h);
    if (rn < 40) {
        rx1[rn] = x - w / 2; ry1[rn] = y - h / 2;
        rx2[rn] = x + w / 2; ry2[rn] = y + h / 2; rn++;
    }
}
int hit(double x1, double y1, double x2, double y2) {
    for (int k = 0; k < rn; k++)
        if (x1 <= rx2[k] && x2 >= rx1[k] && y1 <= ry2[k] && y2 >= ry1[k]) return 1;
    return 0;
}
void wipeBox(double* b) { wipeMark((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, b[2] - b[0], b[3] - b[1]); }
int hitBox(double* b) { return hit(b[0], b[1], b[2], b[3]); }
void copyBox(double* d, double* s) { d[0] = s[0]; d[1] = s[1]; d[2] = s[2]; d[3] = s[3]; }
void lineL(const char* s, char* last, double left, double y, double w, double h,
           int col, int size) {
    if (strcmp(s, last) == 0) return;
    wipe(left + w / 2 - 2, y, w, h);
    pen.pu().moveTo(left, y).pd().c(col).textL(s, col, size);
    strcpy(last, s);
}
void drawStatic() {
    pen.pu().moveTo(-350, 330).pd().c(0).textL("二维数组：杨辉三角与螺旋遍历", 0, 26);
    pen.pu().moveTo(200, 272).pd().c(0).textL("杨辉三角", 0, 18);
    pen.pu().moveTo(-350, -34).pd().c(0).textL("4×5 矩阵螺旋遍历", 0, 18);
}
void triBox(int i, int j, double* b) {
    double x = tx(i, j), y = ty(i);
    b[0] = x - 24.5; b[2] = x + 24.5; b[1] = y - 16.5; b[3] = y + 16.5;
}
void drawTriCell(int i, int j, int col, int fill) {
    double x = tx(i, j), y = ty(i);
    pen.pu().moveTo(x, y).pd().c(col).size(3);
    if (fill) pen.rr(46, 30, col); else pen.r(46, 30, col);
    pen.pu().moveTo(x, y).pd().c(0).text(tri[i][j], 0, 16);
}
// 边界框只擦四条细边（落在格子缝隙里），不碰格子
void eraseBoundary(int t, int b, int l, int r) {
    double x1 = mcx(l) - 31, x2 = mcx(r) + 31, y1 = mcy(b) - 25, y2 = mcy(t) + 25;
    wipe(x1, (y1 + y2) / 2, 2.6, (y2 - y1) + 8);
    wipe(x2, (y1 + y2) / 2, 2.6, (y2 - y1) + 8);
    wipe((x1 + x2) / 2, y2, (x2 - x1) + 8, 2.6);
    wipe((x1 + x2) / 2, y1, (x2 - x1) + 8, 2.6);
}

void draw() {
    if (!staticsDone) {
        drawStatic();
        for (int i = 0; i < 7; i++) { lastSum[i] = -1; for (int j = 0; j < 7; j++) { tCol[i][j] = -99; tFill[i][j] = -1; tVal[i][j] = -99999; } }
        for (int r = 0; r < 4; r++) for (int c = 0; c < 5; c++) { sCol[r][c] = -99; sFill[r][c] = -1; sVis[r][c] = -1; }
        lastNote[0] = lastNote2[0] = lastSeq[0] = 0;
        staticsDone = 1;
    }
    lineL(note, lastNote, -350, 292, 754, 22, 8, 16);

    // ===== 上半：杨辉三角 =====
    rn = 0;
    int tch[7][7], nowTCol[7][7], nowTFill[7][7];
    for (int i = 0; i <= showTri && i < TN; i++) {
        double y = ty(i);
        if (i > lastShowTri) {
            char t[48]; snprintf(t, sizeof t, "第 %d 行", i);
            pen.pu().moveTo(-350, y).pd().c(8).textL(t, 8, 14);
        }
        int s = 0;
        for (int j = 0; j <= i; j++) {
            int col = 2, fill = 0;
            if (i == genRow - 1 && (j == hiJ1 || j == hiJ2)) { col = 5; fill = 1; }
            if (i == genRow && j == newJ) { col = 3; fill = 1; }
            nowTCol[i][j] = col; nowTFill[i][j] = fill;
            tch[i][j] = (col != tCol[i][j] || fill != tFill[i][j] || tri[i][j] != tVal[i][j]) ? 1 : 0;
            s += tri[i][j];
        }
        if (s != lastSum[i]) {
            wipe(240, y, 90, 22);
            char t[48]; snprintf(t, sizeof t, "和 = %d", s);
            pen.pu().moveTo(200, y).pd().c(10).textL(t, 10, 14);
            lastSum[i] = s;
        }
    }
    lastShowTri = showTri;
    int shOn = (genRow > 0 && newJ >= 0 && hiJ1 >= 0 && hiJ2 >= 0) ? 1 : 0;
    double cSh[4] = {0,0,0,0};
    if (shOn) {
        double yp = ty(genRow - 1) - 15, yn = ty(genRow) + 15;
        double ax1 = tx(genRow - 1, hiJ1), ax2 = tx(genRow - 1, hiJ2), bx = tx(genRow, newJ);
        double lo = ax1 < ax2 ? ax1 : ax2; if (bx - 8 < lo) lo = bx - 8;
        double hi = ax1 > ax2 ? ax1 : ax2; if (bx + 8 > hi) hi = bx + 8;
        cSh[0] = lo - 12; cSh[2] = hi + 12; cSh[1] = yn - 12; cSh[3] = yp + 3;
    }
    int shCh = (shOn != lShOn || (shOn && (genRow != lShG || newJ != lShNJ || hiJ1 != lShJ1 || hiJ2 != lShJ2))) ? 1 : 0;
    // ① 擦变化的三角格 + 旧肩膀箭头
    for (int i = 0; i <= showTri && i < TN; i++)
        for (int j = 0; j <= i; j++)
            if (tch[i][j]) { double b[4]; triBox(i, j, b); wipeBox(b); }
    if (shCh && lShOn) wipeBox(LSh);
    // ② 重画变化或被擦到的三角格
    for (int i = 0; i <= showTri && i < TN; i++)
        for (int j = 0; j <= i; j++) {
            double b[4]; triBox(i, j, b);
            if (tch[i][j] || hitBox(b)) {
                drawTriCell(i, j, nowTCol[i][j], nowTFill[i][j]);
                tCol[i][j] = nowTCol[i][j]; tFill[i][j] = nowTFill[i][j]; tVal[i][j] = tri[i][j];
            }
        }
    // ③ 重画肩膀箭头
    if (shOn) {
        if (shCh || hitBox(cSh)) {
            double yp = ty(genRow - 1) - 15, yn = ty(genRow) + 15;
            arrow(tx(genRow - 1, hiJ1), yp, tx(genRow, newJ) - 8, yn, 2, 14);
            arrow(tx(genRow - 1, hiJ2), yp, tx(genRow, newJ) + 8, yn, 2, 14);
            copyBox(LSh, cSh);
        }
        lShOn = 1; lShG = genRow; lShNJ = newJ; lShJ1 = hiJ1; lShJ2 = hiJ2;
    } else lShOn = 0;

    // ===== 下半：螺旋遍历（格子矩形 -> 路径线 -> 数字，三层顺序重画）=====
    int sch[4][5], nowSCol[4][5], nowSFill[4][5];
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) {
            int col = 2, fill = 0;
            if (vis[r][c]) { col = 3; fill = 1; }
            if (r == curR && c == curC) { col = 5; fill = 1; }
            nowSCol[r][c] = col; nowSFill[r][c] = fill;
            sch[r][c] = (col != sCol[r][c] || fill != sFill[r][c] || vis[r][c] != sVis[r][c]) ? 1 : 0;
        }
    int bOn = (showSpiral && top <= bottom && left <= right) ? 1 : 0;
    int bCh = (bOn != lBoundOn || (bOn && (top != lTop || bottom != lBottom || left != lLeft || right != lRight))) ? 1 : 0;
    // ① 擦变化的格子 + 旧边界细边
    for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) if (sch[r][c]) wipe(mcx(c), mcy(r), 59, 47);
    if (bCh && lBoundOn) eraseBoundary(lTop, lBottom, lLeft, lRight);
    // ② 重画格子矩形
    for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) if (sch[r][c]) {
        pen.pu().moveTo(mcx(c), mcy(r)).pd().c(nowSCol[r][c]).size(3);
        if (nowSFill[r][c]) pen.rr(56, 44, nowSCol[r][c]); else pen.r(56, 44, nowSCol[r][c]);
        sCol[r][c] = nowSCol[r][c]; sFill[r][c] = nowSFill[r][c]; sVis[r][c] = vis[r][c];
    }
    // ③ 重画被擦到的路径段（端点格子变过就要补），并标记两端数字待重画
    int txtMark[4][5];
    for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) txtMark[r][c] = sch[r][c];
    if (pathN > 1) {
        pen.c(14);
        for (int i = 0; i + 1 < pathN; i++) {
            int r1 = pathR[i], c1 = pathC[i], r2 = pathR[i + 1], c2 = pathC[i + 1];
            if (sch[r1][c1] || sch[r2][c2]) {
                seg(mcx(c1), mcy(r1) - 10, mcx(c2), mcy(r2) - 10, 2);
                txtMark[r1][c1] = 1; txtMark[r2][c2] = 1;
            }
        }
    }
    // ④ 重画数字 + 访问序号（盖在路径线之上）
    for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) if (txtMark[r][c]) {
        pen.pu().moveTo(mcx(c), mcy(r) + 6).pd().c(0).text(m[r][c], 0, 18);
        if (vis[r][c]) {
            char t[8]; snprintf(t, sizeof t, "%d", order[r][c] + 1);
            pen.pu().moveTo(mcx(c) - 20, mcy(r) + 15).pd().c(8).text(t, 8, 10);
        }
    }
    if (bOn) {
        if (bCh) {
            double x1 = mcx(left) - 31, x2 = mcx(right) + 31, y1 = mcy(bottom) - 25, y2 = mcy(top) + 25;
            pen.pu().moveTo((x1 + x2) / 2, (y1 + y2) / 2).pd().c(14).size(2).r(x2 - x1, y2 - y1);
        }
        lBoundOn = 1; lTop = top; lBottom = bottom; lLeft = left; lRight = right;
    } else lBoundOn = 0;
    if (showSpiral) {
        char t[240]; snprintf(t, sizeof t, "螺旋顺序：%s", seq);
        lineL(t, lastSeq, -350, -268, 754, 24, 0, 16);
    }
    lineL(note2, lastNote2, -350, -302, 754, 22, 10, 15);
}

// 螺旋走到一个格子：点亮它、记下序号、把路径接上去
void step(int r, int c) {
    vis[r][c] = 1;
    order[r][c] = visited;
    pathR[visited] = r; pathC[visited] = c;
    ++visited; ++pathN;
    curR = r; curC = c;
    char t[16];
    snprintf(t, sizeof t, "%d ", m[r][c]);
    strcat(seq, t);
    snprintf(note2, sizeof note2, "第 %d 个：m[%d][%d] = %d", visited, r, c, m[r][c]);
    draw(); wait(0.06);
}

int main() {
    pen.speed(10);
    seq[0] = 0;
    snprintf(note, sizeof note, "① 杨辉三角：每行首尾是 1，中间 = 左肩 + 右肩");
    snprintf(note2, sizeof note2, "tri[i][j] = tri[i-1][j-1] + tri[i-1][j]");
    draw(); wait(0.35);
    for (int i = 0; i < TN; ++i) {
        genRow = i; showTri = i;
        tri[i][0] = tri[i][i] = 1;
        hiJ1 = hiJ2 = newJ = -1;
        snprintf(note2, sizeof note2, "第 %d 行：首尾各放一个 1", i);
        draw(); wait(0.07);
        for (int j = 1; j < i; ++j) {
            tri[i][j] = tri[i - 1][j - 1] + tri[i - 1][j];
            hiJ1 = j - 1; hiJ2 = j; newJ = j;
            snprintf(note2, sizeof note2, "tri[%d][%d] = %d + %d = %d",
                     i, j, tri[i - 1][j - 1], tri[i - 1][j], tri[i][j]);
            draw(); wait(0.07);
        }
    }
    genRow = -1; hiJ1 = hiJ2 = newJ = -1;
    int s6 = 0;
    for (int j = 0; j <= 6; ++j) s6 += tri[6][j];
    snprintf(note, sizeof note, "第 6 行之和 = %d = 2^6（二项式系数）", s6);
    snprintf(note2, sizeof note2, "7 行一共 %d 个格子，只用了二维数组的上三角", TN * (TN + 1) / 2);
    draw(); wait(0.4);

    // ② 螺旋遍历：四个边界往里缩，别重复走角上的格子
    showSpiral = 1;
    snprintf(note, sizeof note, "② 螺旋遍历：top/bottom/left/right 四个边界往里缩");
    snprintf(note2, sizeof note2, "橙框就是还没走过的区域，走一圈缩一圈");
    draw(); wait(0.25);
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; ++c) step(top, c);
        ++top;
        for (int r = top; r <= bottom; ++r) step(r, right);
        --right;
        if (top <= bottom) {
            for (int c = right; c >= left; --c) step(bottom, c);
            --bottom;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; --r) step(r, left);
            ++left;
        }
    }
    curR = curC = -1;
    snprintf(note, sizeof note, "螺旋走完：一共 %d 个数，不重不漏", R * C);
    snprintf(note2, sizeof note2, "右 -> 下 -> 左 -> 上，每走完一条边就缩一个边界");
    draw(); wait(0.5);
    printf("杨辉三角第 6 行和 %d；螺旋顺序 %s\\n", s6, seq);
    return 0;
}
`,
  },
  '栈：括号匹配与逆波兰': {
    group: 'GoC 可视化·栈与队列',
    stdin: '',
    code: `// 栈：括号匹配 + 逆波兰求值
// 左边的格子列就是栈（压入时往上长，出栈时缩回来）；
// 右边是正在扫描的表达式，黄框 + 红箭头标出指针当前指到的字符。
#include <goc.h>
#include <cstdio>
#include <string>

std::string gStk[16];
int gSp = 0;

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

bool isOpen(char c) { return c == '(' || c == '[' || c == '{'; }
bool isClose(char c) { return c == ')' || c == ']' || c == '}'; }
bool matchPair(char o, char c) {
    return (o == '(' && c == ')') || (o == '[' && c == ']') || (o == '{' && c == '}');
}
bool isOp(const std::string &t) {
    return t == "+" || t == "-" || t == "*" || t == "/";
}
int toInt(const std::string &t) {
    int v = 0;
    for (size_t i = 0; i < t.size(); i++) v = v * 10 + (t[i] - '0');
    return v;
}
std::string toStr(int v) {
    if (v == 0) return "0";
    bool neg = v < 0;
    if (neg) v = -v;
    std::string s;
    while (v > 0) { s = char('0' + v % 10) + s; v /= 10; }
    if (neg) s = "-" + s;
    return s;
}
int splitTok(const char *s, std::string out[], int maxn) {
    int n = 0;
    std::string cur;
    for (int i = 0; s[i]; i++) {
        if (s[i] == ' ') {
            if (!cur.empty() && n < maxn) { out[n++] = cur; cur.clear(); }
        } else cur += s[i];
    }
    if (!cur.empty() && n < maxn) out[n++] = cur;
    return n;
}

// ---- 局部重绘的脏跟踪状态 ----
std::string lastStkTxt[8];
int lastStkOcc[8], lastStkCol[8];
int lastRowCol[16], lastRowHi[16], lastRowN = 0;
double lastRowSp = 0;
std::string lastTitle, lastLabel, lastMsg;

// 栈的一格：k=0 是栈底（-250），往上长；只有内容/颜色变了才擦槽重画
void stackCell(int k) {
    int occ = (k < gSp) ? 1 : 0;
    int col = occ ? (k == gSp - 1 ? 4 : 2) : 8;
    std::string txt = occ ? gStk[k] : std::string("");
    if (occ == lastStkOcc[k] && col == lastStkCol[k] && txt == lastStkTxt[k]) return;
    double y = -250 + 56 * k;
    pen.setAngle(0);
    pen.pu().moveTo(-250, y).pd().clsRec(60, 54);      // 槽距 56，擦 54 不碰邻居
    if (occ) {
        pen.pu().moveTo(-250, y).pd().c(col).size(2).rr(52, 52);
        pen.pu().moveTo(-250, y).pd().c(k == gSp - 1 ? 0 : 15).text(gStk[k], 0, 26);
    } else {
        pen.pu().moveTo(-250, y).pd().c(8).size(1).r(52, 52);
    }
    lastStkOcc[k] = occ; lastStkCol[k] = col; lastStkTxt[k] = txt;
}
void drawStack() { for (int k = 0; k < 8; k++) stackCell(k); }

// 一行里的一个槽：高亮框 + 字符 + 下面的红箭头都在这块里，一起擦一起画
void rowSlot(const std::string &t, int k, double sp, int hi, int col,
             double bw, double bh, int ts) {
    double x = -120 + sp * k;
    pen.setAngle(0);
    pen.pu().moveTo(x, 199).pd().clsRec(sp - 4, 66);   // y 166..232：盖住框和箭头
    if (k == hi) pen.pu().moveTo(x, 210).pd().c(5).size(2).rr(bw, bh);
    pen.pu().moveTo(x, 210).pd().c(col).text(t, 0, ts);
    if (k == hi) {
        pen.pu().moveTo(x, 180).pd().c(1).size(2);
        pen.polXY(x, 184).polXY(x - 9, 169).polXY(x + 9, 169).pol(1, 1);
        pen.polXY();
    }
}

// 整行刷新：只画「颜色或高亮变了」的槽；换行距/变短时把多出来的旧槽擦掉
void refreshRow(std::string t[], int n, int hi, double sp, int grayBefore,
                double bw, double bh, int ts) {
    if (sp != lastRowSp) {
        pen.setAngle(0);
        pen.pu().moveTo(30, 199).pd().clsRec(380, 68);
        lastRowN = 0; lastRowSp = sp;
    }
    for (int k = n; k < lastRowN; k++) {
        pen.setAngle(0);
        pen.pu().moveTo(-120 + sp * k, 199).pd().clsRec(sp - 4, 66);
    }
    for (int k = 0; k < n; k++) {
        int col = (grayBefore >= 0 && k < grayBefore) ? 8 : 0;
        int h = (k == hi) ? 1 : 0;
        if (k >= lastRowN || col != lastRowCol[k] || h != lastRowHi[k]) {
            rowSlot(t[k], k, sp, hi, col, bw, bh, ts);
            lastRowCol[k] = col; lastRowHi[k] = h;
        }
    }
    lastRowN = n;
}

// 表达式一行字符，黄框标出当前字符，红色小箭头指过去
void drawChars(const char *s, int i, double sp) {
    int n = 0;
    while (s[n]) n++;
    std::string t[16];
    for (int k = 0; k < n; k++) t[k] = std::string(1, s[k]);
    refreshRow(t, n, i, sp, -1, 32, 38, 24);
}

// 逆波兰的一行 token
void drawTokens(std::string tok[], int n, int i) {
    refreshRow(tok, n, i, 50, i, 40, 40, 22);
}

// 标题 / 行标签 / 说明：各自一个固定槽，文字变了才擦掉重写
void putTitle(const std::string &s) {
    if (s == lastTitle) return;
    pen.setAngle(0);
    pen.pu().moveTo(-210, 280).pd().clsRec(320, 36);
    pen.pu().moveTo(-360, 280).pd().c(0).textL(s, 0, 26);
    lastTitle = s;
}
void putLabel(const std::string &s) {
    if (s == lastLabel) return;
    pen.setAngle(0);
    pen.pu().moveTo(-120, 252).pd().clsRec(130, 32);
    pen.pu().moveTo(-120, 252).pd().c(0).text(s, 0, 20);
    lastLabel = s;
}
void putMsg(const std::string &s) {
    if (s == lastMsg) return;
    pen.setAngle(0);
    pen.pu().moveTo(120, 130).pd().clsRec(500, 32);
    pen.pu().moveTo(-120, 130).pd().c(0).textL(s, 0, 18);
    lastMsg = s;
}

// 静态背景只画一次：两个固定标签都放在动态槽位外面
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-250, 186).pd().c(0).text("栈", 0, 22);
    pen.pu().moveTo(-250, -298).pd().c(8).text("栈底", 0, 16);
}

int main() {
    pen.speed(10).size(2);
    const char *exprs[4] = {"({[]})", "([)]", "((()", "{[()]}"};
    for (int k = 0; k < 8; k++) { lastStkOcc[k] = -1; lastStkCol[k] = -1; }
    staticBg();

    // 第一部分：括号匹配
    for (int e = 0; e < 4; e++) {
        gSp = 0;
        const char *s = exprs[e];
        int n = 0;
        while (s[n]) n++;
        std::string msg;
        bool bad = false;
        for (int i = 0; i < n; i++) {
            char c = s[i];
            if (isOpen(c)) {
                gStk[gSp++] = std::string(1, c);
                msg = std::string("读到 '") + c + "'：压栈";
            } else if (isClose(c)) {
                if (gSp == 0) {
                    msg = std::string("读到 '") + c + "'：栈空了！不匹配";
                    bad = true;
                } else {
                    std::string o = gStk[gSp - 1];
                    gSp--;
                    if (matchPair(o[0], c)) msg = std::string("读到 '") + c + "'：和栈顶 " + o + " 配对成功";
                    else { msg = std::string("读到 '") + c + "'：和栈顶 " + o + " 不配对！"; bad = true; }
                }
            } else {
                msg = std::string("读到 '") + c + "'：不是括号，忽略";
            }
            putTitle("栈：括号匹配与逆波兰");
            putLabel("表达式");
            drawStack();
            drawChars(s, i, 44);
            putMsg(msg);
            wait(0.07);
            if (bad) break;
        }
        if (!bad && gSp != 0) msg = "扫描结束：栈里还剩 " + toStr(gSp) + " 个 → 不匹配";
        else if (!bad) msg = "扫描结束：栈空了 → 括号匹配";
        putTitle("栈：括号匹配与逆波兰");
        putLabel("表达式");
        drawStack();
        drawChars(s, -1, 44);
        putMsg(msg);
        wait(0.25);
    }

    // 第二部分：逆波兰求值
    const char *rpns[2] = {"3 4 2 - 5 * +", "10 9 7 - / 1 +"};
    int results[2];
    for (int e = 0; e < 2; e++) {
        std::string tok[16];
        int nt = splitTok(rpns[e], tok, 16);
        gSp = 0;
        for (int i = 0; i < nt; i++) {
            std::string msg;
            if (isOp(tok[i])) {
                int b = toInt(gStk[gSp - 1]); gSp--;
                int a = toInt(gStk[gSp - 1]); gSp--;
                int v = tok[i] == "+" ? a + b : tok[i] == "-" ? a - b : tok[i] == "*" ? a * b : a / b;
                gStk[gSp++] = toStr(v);
                msg = std::string("读到 ") + tok[i] + "：弹出 " + toStr(a) + " 和 " + toStr(b) +
                      "，算出 " + toStr(v) + " 再压回";
            } else {
                gStk[gSp++] = tok[i];
                msg = std::string("读到操作数 ") + tok[i] + "：压栈";
            }
            putTitle("栈：逆波兰求值");
            putLabel("后缀式");
            drawStack();
            drawTokens(tok, nt, i);
            putMsg(msg);
            wait(0.07);
        }
        results[e] = toInt(gStk[gSp - 1]);
        putTitle("栈：逆波兰求值");
        putLabel("后缀式");
        drawStack();
        drawTokens(tok, nt, nt);
        putMsg(std::string("算完：栈里只剩 ") + toStr(results[e]));
        wait(0.25);
    }

    printf("括号匹配：({[]}) 匹配，([)] 不匹配，((() 不匹配，{[()]} 匹配\\n");
    printf("逆波兰：3 4 2 - 5 * + = %d，10 9 7 - / 1 + = %d（栈：后进先出）\\n",
           results[0], results[1]);
    return 0;
}
`,
  },
  '队列：循环队列与约瑟夫环': {
    group: 'GoC 可视化·栈与队列',
    stdin: '',
    code: `// 队列：循环队列 + 约瑟夫环
// 上面一圈格子是定长循环队列（head / rear 两个指针绕圈走，满的时候 rear 追上 head）；
// 下面一圈是人，模拟约瑟夫环：报数到 m 的那位出列。
#include <goc.h>
#include <cstdio>
#include <string>

const int CAP = 8;
int qData[CAP], qHead = 0, qTail = 0, qCnt = 0;

const int N = 10, M = 3;
int nxt[N];
bool alive[N];
int jHead = 0, jPrev = N - 1, jAlive = N;

std::string qMsg = "先把 1~10 依次 push 进容量 8 的循环队列";
std::string jMsg = "约瑟夫环：n=10, m=3";
int jCur = -1, jCnt = 0;

std::string toStr(int v) {
    if (v == 0) return "0";
    bool neg = v < 0;
    if (neg) v = -v;
    std::string s;
    while (v > 0) { s = char('0' + v % 10) + s; v /= 10; }
    if (neg) s = "-" + s;
    return s;
}

void posOn(int k, int cnt, double cx, double cy, double r, double &x, double &y) {
    double a = 90 - 360.0 * k / cnt;
    x = cx + r * cos_deg(a);
    y = cy + r * sin_deg(a);
}

// ---- 局部重绘的脏跟踪 ----
int lastQOcc[CAP], lastQVal[CAP];
int lastHead = -1, lastTail = -1;
int lastAlive[N], lastCur[N];
int lastCntSlot = -1, lastCntVal = -1;
std::string lastQMsg, lastJMsg;

// 标题（静态，但顶部箭头槽擦除啃到时按 z 序补画）
void queueTitle() {
    pen.setAngle(0);
    pen.pu().moveTo(-360, 330).pd().c(0).textL("队列：循环队列与约瑟夫环", 0, 26);
}

// 箭头擦除槽：head/rear 同槽时标签要左右错开，槽 0 的标签还要躲开 stdout 顶带，
// 所以槽 0 的擦除矩形偏右加宽；其余槽加宽到 74 盖住错开的标签
void arrowRect(int slot, int cnt, double cx, double cy, double r,
               double &ex, double &ey, double &w) {
    double a = 90 - 360.0 * slot / cnt;
    double ca = cos_deg(a), sa = sin_deg(a);
    double tan = (slot == 0) ? 25 : 0;
    w = (slot == 0) ? 112 : 74;
    ex = cx + (r + 57) * ca + sa * tan;
    ey = cy + (r + 57) * sa - ca * tan;
}

// 绕到圈外、再朝圈里指的小箭头（擦除由 drawQueue 统一做）
void arrowTo(int slot, int cnt, double cx, double cy, double r, int col, const char *lab,
             double labRad, double labTan) {
    double a = 90 - 360.0 * slot / cnt;
    double ca = cos_deg(a), sa = sin_deg(a);
    double tx = cx + (r + 28) * ca, ty = cy + (r + 28) * sa;
    double bx = cx + (r + 50) * ca, by = cy + (r + 50) * sa;
    double px = -sa * 10, py = ca * 10;
    pen.setAngle(0);
    pen.pu().moveTo(bx, by).pd().c(col).size(2);
    pen.polXY(tx, ty).polXY(bx + px, by + py).polXY(bx - px, by - py).pol(1, col);
    pen.polXY();
    pen.pu().moveTo(cx + (r + labRad) * ca + sa * labTan,
                    cy + (r + labRad) * sa - ca * labTan).pd().c(col).text(lab, 0, 14);
}

// 队列的一格：erase=true 擦槽重画；false 只原位重画（补回被箭头擦掉的边角）
void qCell(int s, bool erase) {
    double cx = 0, cy = 155, r = 105;
    double x, y;
    posOn(s, CAP, cx, cy, r, x, y);
    bool occ = false;
    int val = 0;
    for (int i = 0; i < qCnt; i++) {
        int slot = (qHead + i) % CAP;
        if (slot == s) { occ = true; val = qData[slot]; }
    }
    if (erase) {
        pen.setAngle(0);
        pen.pu().moveTo(x, y).pd().clsRec(54, 54);
    }
    if (occ) {
        pen.pu().moveTo(x, y).pd().c(2).size(2).rr(46, 46);
        pen.pu().moveTo(x, y).pd().c(15).text(val, 0, 24);
    } else {
        pen.pu().moveTo(x, y).pd().c(8).size(1).r(46, 46);
    }
    lastQOcc[s] = occ ? 1 : 0; lastQVal[s] = val;
}

void drawQueue() {
    double cx = 0, cy = 155, r = 105;
    bool changed = false;
    for (int s = 0; s < CAP; s++) {
        bool occ = false;
        int val = 0;
        for (int i = 0; i < qCnt; i++) {
            int slot = (qHead + i) % CAP;
            if (slot == s) { occ = true; val = qData[slot]; }
        }
        if ((occ ? 1 : 0) != lastQOcc[s] || val != lastQVal[s]) { qCell(s, true); changed = true; }
    }
    if (qHead != lastHead || qTail != lastTail) changed = true;
    if (changed) {
        // 旧槽不擦就是残影：head / rear 的旧槽和新槽一起擦，再画新箭头；
        // 同槽时两个标签左右错开（槽 0 都偏右，躲开标题和 stdout 顶带）
        int sl[4];
        int ns = 0;
        if (lastHead >= 0) sl[ns++] = lastHead;
        if (lastTail >= 0) sl[ns++] = lastTail;
        sl[ns++] = qHead;
        sl[ns++] = qTail;
        double ex[4], ey[4], ew[4];
        bool touch = false;
        for (int i = 0; i < ns; i++) {
            arrowRect(sl[i], CAP, cx, cy, r, ex[i], ey[i], ew[i]);
            pen.setAngle(0);
            pen.pu().moveTo(ex[i], ey[i]).pd().clsRec(ew[i], 62);
            if (ex[i] - ew[i] / 2 < -20 && ex[i] + ew[i] / 2 > -360 &&
                ey[i] - 31 < 343 && ey[i] + 31 > 317) touch = true;
        }
        bool same = (qHead == qTail);
        double hRad = (qHead == 0) ? 44 : 66;
        double hTan = (qHead == 0) ? 20 : (same ? -20 : 0);
        double tRad = (qTail == 0) ? 44 : 66;
        double tTan = (qTail == 0) ? (same ? 58 : 20) : (same ? 20 : 0);
        arrowTo(qHead, CAP, cx, cy, r, 1, "head", hRad, hTan);
        arrowTo(qTail, CAP, cx, cy, r, 14, "rear", tRad, tTan);
        if (touch) queueTitle();   // 擦除矩形啃到标题，按 z 序补画
        // 加宽的擦除矩形会啃到格子边角：被啃到的格子原位补画（不擦）
        for (int s = 0; s < CAP; s++) {
            double x, y;
            posOn(s, CAP, cx, cy, r, x, y);
            for (int i = 0; i < ns; i++) {
                if (x + 24 > ex[i] - ew[i] / 2 && x - 24 < ex[i] + ew[i] / 2 &&
                    y + 24 > ey[i] - 31 && y - 24 < ey[i] + 31) { qCell(s, false); break; }
            }
        }
        lastHead = qHead; lastTail = qTail;
    }
}

// 约瑟夫环的一个人：erase=true 擦槽重画
void jCell(int k, bool erase) {
    double cx = 0, cy = -170, r = 105;
    double x, y;
    posOn(k, N, cx, cy, r, x, y);
    if (erase) {
        pen.setAngle(0);
        pen.pu().moveTo(x, y).pd().clsRec(52, 52);
    }
    if (alive[k]) {
        int col = (k == jCur) ? 5 : 3;
        pen.pu().moveTo(x, y).pd().c(col).size(2).oo(24, col);
        pen.pu().moveTo(x, y).pd().c(k == jCur ? 0 : 15).text(k + 1, 0, 22);
    } else {
        pen.pu().moveTo(x, y).pd().c(8).size(1).o(24, 8);
        pen.pu().moveTo(x, y).pd().c(8).text(k + 1, 8, 20);
    }
    lastAlive[k] = alive[k] ? 1 : 0; lastCur[k] = (k == jCur) ? 1 : 0;
}

void drawJosephus() {
    double cx = 0, cy = -170, r = 105;
    for (int k = 0; k < N; k++) {
        int a = alive[k] ? 1 : 0, c = (k == jCur) ? 1 : 0;
        if (a != lastAlive[k] || c != lastCur[k]) jCell(k, true);
    }
    // 报数数字：圈外一个小槽，挪位置时先擦旧的
    int slot = (jCur >= 0 && jCnt > 0) ? jCur : -1;
    if (slot != lastCntSlot || jCnt != lastCntVal) {
        pen.setAngle(0);
        if (lastCntSlot >= 0) {
            double x, y;
            posOn(lastCntSlot, N, cx, cy, r + 44, x, y);
            pen.pu().moveTo(x, y).pd().clsRec(28, 26);
        }
        if (slot >= 0) {
            double x, y;
            posOn(slot, N, cx, cy, r + 44, x, y);
            pen.pu().moveTo(x, y).pd().c(0).text(jCnt, 0, 20);
        }
        lastCntSlot = slot; lastCntVal = jCnt;
    }
}

// 两条说明挪到画布最下面：原来夹在两个圈中间，会和圈外的箭头抢像素
void putQMsg(const std::string &s) {
    if (s == lastQMsg) return;
    pen.setAngle(0);
    pen.pu().moveTo(-100, -352).pd().clsRec(540, 26);
    pen.pu().moveTo(-360, -352).pd().c(0).textL(s, 0, 17);
    lastQMsg = s;
}
void putJMsg(const std::string &s) {
    if (s == lastJMsg) return;
    pen.setAngle(0);
    pen.pu().moveTo(-100, -378).pd().clsRec(540, 26);
    pen.pu().moveTo(-360, -378).pd().c(0).textL(s, 0, 17);
    lastJMsg = s;
}

// 静态背景只画一次：标题和圈心的 q 都在动态槽位之外
void staticBg() {
    queueTitle();
    pen.pu().moveTo(0, 155).pd().c(0).text("q", 0, 20);
}

void drawAll() {
    drawQueue();
    drawJosephus();
    putQMsg(qMsg);
    putJMsg(jMsg);
}

int main() {
    pen.speed(10).size(2);
    for (int s = 0; s < CAP; s++) { lastQOcc[s] = -1; lastQVal[s] = -1; }
    for (int k = 0; k < N; k++) { lastAlive[k] = -1; lastCur[k] = -1; }
    staticBg();
    drawAll();
    wait(0.3);

    // 上半部分：往循环队列里塞 1~10
    for (int i = 1; i <= 10; i++) {
        if (qCnt < CAP) {
            qData[qTail] = i;
            qTail = (qTail + 1) % CAP;
            qCnt++;
            qMsg = "push(" + toStr(i) + ")：成功，rear 往后挪一格，队列里有 " + toStr(qCnt) + " 个";
        } else {
            qMsg = "push(" + toStr(i) + ")：失败！队列已满（rear 追上 head 了）";
        }
        drawAll();
        wait(0.06);
    }
    while (qCnt > 0) {
        int v = qData[qHead];
        qHead = (qHead + 1) % CAP;
        qCnt--;
        qMsg = "pop()：" + toStr(v) + " 出队（先进先出），head 往后挪一格";
        drawAll();
        wait(0.06);
    }

    // 下半部分：约瑟夫环
    for (int i = 0; i < N; i++) { nxt[i] = (i + 1) % N; alive[i] = true; }
    jHead = 0; jPrev = N - 1; jAlive = N;
    std::string order;
    while (jAlive > 1) {
        for (int step = 1; step <= M; step++) {
            if (step < M) {
                jPrev = jHead;
                jHead = nxt[jHead];
                jCur = jHead;
                jCnt = step;
                jMsg = "报数 " + toStr(step) + "：轮到第 " + toStr(jHead + 1) + " 号";
                drawAll();
                wait(0.05);
            } else {
                int v = jHead;
                jCur = v;
                jCnt = M;
                jMsg = "报数到 " + toStr(M) + "：第 " + toStr(v + 1) + " 号出列！";
                drawAll();
                wait(0.09);
                alive[v] = false;
                nxt[jPrev] = nxt[v];
                jHead = nxt[v];
                jAlive--;
                order += toStr(v + 1) + " ";
                jCur = jHead;
                jCnt = 0;
                jMsg = "第 " + toStr(v + 1) + " 号出列，剩下 " + toStr(jAlive) + " 个人";
                drawAll();
                wait(0.05);
            }
        }
    }
    jMsg = "最后剩下第 " + toStr(jHead + 1) + " 号";
    drawAll();
    wait(0.3);

    printf("出列顺序：%s，幸存者：%d\\n", order.c_str(), jHead + 1);
    return 0;
}
`,
  },
  '栈的常用操作（画图版）': {
    group: 'GoC 可视化·栈与队列',
    stdin: '',
    code: `// 栈的常用操作：push / top / size / empty / pop
// 左边一列格子就是栈（从下往上长）；右边是操作日志，最新的一条标红。
#include <goc.h>
#include <cstdio>
#include <string>

const int MAXL = 24;
int st[16], top = 0;
std::string lg[MAXL];
int nlog = 0;

std::string toStr(int v) {
    if (v == 0) return "0";
    bool neg = v < 0;
    if (neg) v = -v;
    std::string s;
    while (v > 0) { s = char('0' + v % 10) + s; v /= 10; }
    if (neg) s = "-" + s;
    return s;
}

// ---- 局部重绘的脏跟踪 ----
int lastVal[8], lastCol[8];
int lastTopSlot = -2;
std::string lastLog[12];
int lastLogCol[12], lastLogN = 0;

// 栈的一格：col < 0 表示空格子
void cell(int i, int col) {
    double y = -280 + i * 52;
    pen.setAngle(0);
    pen.pu().moveTo(-250, y).pd().clsRec(92, 50);      // 槽距 52，擦 50 不碰邻居
    if (col >= 0) {
        pen.pu().moveTo(-250, y).pd().c(col).size(2).rr(84, 44);
        pen.pu().moveTo(-250, y).pd().c(0).text(st[i], 0, 22);
    } else {
        pen.pu().moveTo(-250, y).pd().c(8).size(1).r(84, 44);
    }
}

// 栈顶指针（红三角 + 「栈顶」）自己一个槽，挪位置时先擦旧的
void topMark(int slot) {
    if (slot == lastTopSlot) return;
    pen.setAngle(0);
    if (lastTopSlot >= 0) {
        double y = -280 + lastTopSlot * 52;
        pen.pu().moveTo(-137, y - 1).pd().clsRec(76, 26);
    }
    if (slot >= 0) {
        double y = -280 + slot * 52;
        pen.pu().moveTo(-168, y).pd().c(1).size(2);
        pen.polXY(-158, y).polXY(-170, y - 10).polXY(-146, y - 10).pol(1, 1);
        pen.polXY();
        pen.pu().moveTo(-136, y).pd().c(1).textL("栈顶", 0, 16);
    }
    lastTopSlot = slot;
}

// 日志的一行：一个固定横槽
void logRow(int j, const std::string &s, int col) {
    double y = 240 - j * 30;
    pen.setAngle(0);
    pen.pu().moveTo(110, y).pd().clsRec(420, 26);
    pen.pu().moveTo(-90, y).pd().c(col).textL(s, 0, 18);
}

// hl：要高亮的格子下标；-1 表示不高亮
void drawAll(int hl) {
    for (int i = 0; i < 8; i++) {
        int col = -1;
        if (i < top) {
            col = 2;
            if (i == top - 1) col = 5;        // 栈顶
            if (hl == i) col = 1;             // 本步高亮
        }
        int v = (i < top) ? st[i] : 0;
        if (col != lastCol[i] || v != lastVal[i]) {
            cell(i, col);
            lastCol[i] = col; lastVal[i] = v;
        }
    }
    topMark(top > 0 ? top - 1 : -1);

    int first = nlog > 12 ? nlog - 12 : 0;
    int n = nlog - first;
    for (int j = n; j < lastLogN; j++) {
        pen.setAngle(0);
        pen.pu().moveTo(110, 240 - j * 30).pd().clsRec(420, 26);
    }
    for (int j = 0; j < n; j++) {
        int col = (first + j == nlog - 1) ? 1 : 0;
        if (j >= lastLogN || lg[first + j] != lastLog[j] || col != lastLogCol[j]) {
            logRow(j, lg[first + j], col);
            lastLog[j] = lg[first + j]; lastLogCol[j] = col;
        }
    }
    lastLogN = n;
}

// 静态背景只画一次：标题、日志表头、栈底标签都在动态槽位之外
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-360, 330).pd().c(0).textL("栈的常用操作", 0, 26);
    pen.pu().moveTo(-90, 280).pd().c(0).textL("操作日志", 0, 20);
    pen.pu().moveTo(-250, -330).pd().c(8).textL("栈底", 0, 16);
}

int main() {
    pen.speed(10);
    for (int i = 0; i < 8; i++) { lastVal[i] = -1; lastCol[i] = -2; }
    staticBg();
    int vals[5] = {1, 3, 2, 5, 4};
    for (int i = 0; i < 5; i++) {
        st[top++] = vals[i];
        lg[nlog++] = "push(" + toStr(vals[i]) + ")";
        drawAll(-1);
        wait(0.15);
    }
    lg[nlog++] = "top() = " + toStr(st[top - 1]) + "（只看栈顶，不弹出来）";
    drawAll(top - 1);
    wait(0.4);
    lg[nlog++] = "size() = " + toStr(top) + "，empty() = 否";
    drawAll(-1);
    wait(0.3);
    for (int i = 0; i < 5; i++) {
        int v = st[--top];
        lg[nlog++] = "pop() -> " + toStr(v) + "（后进先出）";
        drawAll(-1);
        wait(0.18);
    }
    lg[nlog++] = "弹完了，栈空，size() = " + toStr(top);
    drawAll(-1);
    wait(0.3);

    printf("出栈顺序：4 5 2 3 1，一共压了 5 个、弹了 5 个，栈现在是空的。\\n");
    return 0;
}
`,
  },
  '队列的常用操作（画图版）': {
    group: 'GoC 可视化·栈与队列',
    stdin: '',
    code: `// 队列的常用操作：push / front / back / size / empty / pop
// 左边一列格子就是队列（队尾从下面往上接，队首永远在最底下）；右边是操作日志。
#include <goc.h>
#include <cstdio>
#include <string>

const int MAXL = 24;
int q[16], qlen = 0;
std::string lg[MAXL];
int nlog = 0;

std::string toStr(int v) {
    if (v == 0) return "0";
    bool neg = v < 0;
    if (neg) v = -v;
    std::string s;
    while (v > 0) { s = char('0' + v % 10) + s; v /= 10; }
    if (neg) s = "-" + s;
    return s;
}

// ---- 局部重绘的脏跟踪 ----
int lastVal[8], lastCol[8];
int lastFront = -1, lastBackSlot = -2;
std::string lastLog[12];
int lastLogCol[12], lastLogN = 0;

// 队列的一格：col < 0 表示空格子
void cell(int i, int col) {
    double y = -280 + i * 52;
    pen.setAngle(0);
    pen.pu().moveTo(-250, y).pd().clsRec(92, 50);      // 槽距 52，擦 50 不碰邻居
    if (col >= 0) {
        pen.pu().moveTo(-250, y).pd().c(col).size(2).rr(84, 44);
        pen.pu().moveTo(-250, y).pd().c(0).text(q[i], 0, 22);
    } else {
        pen.pu().moveTo(-250, y).pd().c(8).size(1).r(84, 44);
    }
}

// 队首标记：永远在最底下那一格，只在出现/消失时动
void frontMark(bool on) {
    int v = on ? 1 : 0;
    if (v == lastFront) return;
    pen.setAngle(0);
    pen.pu().moveTo(-110, -275).pd().clsRec(130, 28);
    if (on) {
        pen.pu().moveTo(-168, -280).pd().c(1).size(2);
        pen.polXY(-158, -280).polXY(-170, -270).polXY(-146, -270).pol(1, 1);
        pen.polXY();
        pen.pu().moveTo(-136, -280).pd().c(1).textL("队首 front", 0, 16);
    }
    lastFront = v;
}

// 队尾标记：跟着队尾往上挪，先擦旧槽
void backMark(int slot) {
    if (slot == lastBackSlot) return;
    pen.setAngle(0);
    if (lastBackSlot >= 0) {
        double y = -280 + lastBackSlot * 52;
        pen.pu().moveTo(-96, y).pd().clsRec(90, 24);
    }
    if (slot >= 0) {
        double y = -280 + slot * 52;
        pen.pu().moveTo(-136, y).pd().c(4).textL("队尾 back", 0, 16);
    }
    lastBackSlot = slot;
}

// 日志的一行：一个固定横槽
void logRow(int j, const std::string &s, int col) {
    double y = 240 - j * 30;
    pen.setAngle(0);
    pen.pu().moveTo(110, y).pd().clsRec(420, 26);
    pen.pu().moveTo(-90, y).pd().c(col).textL(s, 0, 18);
}

// hl：要高亮的格子下标（-1 不高亮）
void drawAll(int hl) {
    for (int i = 0; i < 8; i++) {
        int col = -1;
        if (i < qlen) {
            col = 2;
            if (i == 0) col = 5;             // 队首
            if (i == qlen - 1) col = 4;      // 队尾
            if (hl == i) col = 1;            // 本步高亮
        }
        int v = (i < qlen) ? q[i] : 0;
        if (col != lastCol[i] || v != lastVal[i]) {
            cell(i, col);
            lastCol[i] = col; lastVal[i] = v;
        }
    }
    frontMark(qlen > 0);
    backMark(qlen > 0 ? qlen - 1 : -1);

    int first = nlog > 12 ? nlog - 12 : 0;
    int n = nlog - first;
    for (int j = n; j < lastLogN; j++) {
        pen.setAngle(0);
        pen.pu().moveTo(110, 240 - j * 30).pd().clsRec(420, 26);
    }
    for (int j = 0; j < n; j++) {
        int col = (first + j == nlog - 1) ? 1 : 0;
        if (j >= lastLogN || lg[first + j] != lastLog[j] || col != lastLogCol[j]) {
            logRow(j, lg[first + j], col);
            lastLog[j] = lg[first + j]; lastLogCol[j] = col;
        }
    }
    lastLogN = n;
}

// 静态背景只画一次：标题和日志表头都在动态槽位之外
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-360, 330).pd().c(0).textL("队列的常用操作", 0, 26);
    pen.pu().moveTo(-90, 280).pd().c(0).textL("操作日志", 0, 20);
}

int main() {
    pen.speed(10);
    for (int i = 0; i < 8; i++) { lastVal[i] = -1; lastCol[i] = -2; }
    staticBg();
    int vals[5] = {1, 3, 2, 5, 4};
    for (int i = 0; i < 5; i++) {
        q[qlen++] = vals[i];
        lg[nlog++] = "push(" + toStr(vals[i]) + ")（从队尾进）";
        drawAll(-1);
        wait(0.15);
    }
    lg[nlog++] = "front() = " + toStr(q[0]) + "（队首，不弹出）";
    drawAll(0);
    wait(0.4);
    lg[nlog++] = "back() = " + toStr(q[qlen - 1]) + "（队尾）";
    drawAll(qlen - 1);
    wait(0.3);
    lg[nlog++] = "size() = " + toStr(qlen) + "，empty() = 否";
    drawAll(-1);
    wait(0.25);
    for (int i = 0; i < 5; i++) {
        int v = q[0];
        for (int j = 0; j < qlen - 1; j++) q[j] = q[j + 1];
        qlen--;
        lg[nlog++] = "pop() -> " + toStr(v) + "（先进先出）";
        drawAll(-1);
        wait(0.18);
    }
    lg[nlog++] = "弹完了，队列空，size() = " + toStr(qlen);
    drawAll(-1);
    wait(0.3);

    printf("出队顺序：1 3 2 5 4，一共入了 5 个、出了 5 个，队列现在是空的。\\n");
    return 0;
}
`,
  },
  '双端队列：两头都能进出': {
    group: 'GoC 可视化·栈与队列',
    stdin: '',
    code: `// 双向队列的常用操作：两头都能进、也都能出。
// 左边一排格子从左到右就是「队首 -> 队尾」，左进右出、右进左出都演示一遍。
#include <goc.h>
#include <cstdio>
#include <string>

const int MAXL = 24;
int dq[16], dlen = 0;
std::string lg[MAXL];
int nlog = 0;

std::string toStr(int v) {
    if (v == 0) return "0";
    bool neg = v < 0;
    if (neg) v = -v;
    std::string s;
    while (v > 0) { s = char('0' + v % 10) + s; v /= 10; }
    if (neg) s = "-" + s;
    return s;
}

// ---- 局部重绘的脏跟踪 ----
int lastVal[8], lastCol[8], lastLen = 0;
std::string lastLog[12];
int lastLogCol[12], lastLogN = 0;

double cx(int i) { return -270 + 39 + i * 78; }

// 一排里的一格：擦掉旧槽再画（槽距 78，擦 76 不碰邻居）
void cell(int i, int col) {
    pen.setAngle(0);
    pen.pu().moveTo(cx(i), 60).pd().clsRec(76, 56);
    pen.pu().moveTo(cx(i), 60).pd().c(col).size(2).rr(70, 50);
    pen.pu().moveTo(cx(i), 60).pd().c(0).text(dq[i], 0, 24);
}
void clearCell(int i) {
    pen.setAngle(0);
    pen.pu().moveTo(cx(i), 60).pd().clsRec(76, 56);
}

// 日志的一行：一个固定横槽（最多 10 行，末行 y=-354，保证不贴底边）
void logRow(int j, const std::string &s, int col) {
    double y = -120 - j * 26;
    pen.setAngle(0);
    pen.pu().moveTo(0, y).pd().clsRec(740, 24);
    pen.pu().moveTo(-350, y).pd().c(col).textL(s, 0, 17);
}

// hlL / hlR：要高亮的左右格子；popIdx：刚被弹出的那个格子（标红）
void drawAll(int hlL, int hlR, int popIdx) {
    for (int i = 0; i < dlen; i++) {
        int col = 2;
        if (i == 0) col = 5;
        if (i == dlen - 1) col = 4;
        if (i == hlL || i == hlR) col = 1;
        if (i == popIdx) col = 1;
        if (i >= lastLen || col != lastCol[i] || dq[i] != lastVal[i]) {
            cell(i, col);
            lastCol[i] = col; lastVal[i] = dq[i];
        }
    }
    for (int i = dlen; i < lastLen; i++) clearCell(i);   // 变短时擦掉多出来的格子
    lastLen = dlen;

    int first = nlog > 10 ? nlog - 10 : 0;
    int n = nlog - first;
    for (int j = n; j < lastLogN; j++) {
        pen.setAngle(0);
        pen.pu().moveTo(0, -120 - j * 26).pd().clsRec(740, 24);
    }
    for (int j = 0; j < n; j++) {
        int col = (first + j == nlog - 1) ? 1 : 0;
        if (j >= lastLogN || lg[first + j] != lastLog[j] || col != lastLogCol[j]) {
            logRow(j, lg[first + j], col);
            lastLog[j] = lg[first + j]; lastLogCol[j] = col;
        }
    }
    lastLogN = n;
}

// 静态背景只画一次：标题、队首队尾标签、日志表头都在动态槽位之外
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-360, 330).pd().c(0).textL("双端队列：两头都能进出", 0, 26);
    pen.pu().moveTo(-320, -20).pd().c(5).textL("<- 队首 front", 0, 18);
    pen.pu().moveTo(230, -20).pd().c(4).textL("队尾 back ->", 0, 18);
    pen.pu().moveTo(-350, -80).pd().c(0).textL("操作日志", 0, 20);
}

void pushBack(int v) {
    dq[dlen++] = v;
    lg[nlog++] = "push_back(" + toStr(v) + ")  从右端进";
    drawAll(-1, -1, -1);
    wait(0.18);
}
void pushFront(int v) {
    for (int j = dlen; j > 0; j--) dq[j] = dq[j - 1];
    dq[0] = v;
    dlen++;
    lg[nlog++] = "push_front(" + toStr(v) + ")  从左端进";
    drawAll(-1, -1, -1);
    wait(0.18);
}
void popFront() {
    int v = dq[0];
    for (int j = 0; j < dlen - 1; j++) dq[j] = dq[j + 1];
    dlen--;
    lg[nlog++] = "pop_front() -> " + toStr(v) + "  从左端出";
    drawAll(-1, -1, -1);
    wait(0.18);
}
void popBack() {
    int v = dq[dlen - 1];
    dlen--;
    lg[nlog++] = "pop_back() -> " + toStr(v) + "  从右端出";
    drawAll(-1, -1, -1);
    wait(0.18);
}

int main() {
    pen.speed(10);
    staticBg();
    pushBack(2);
    pushBack(5);
    pushBack(4);
    pushFront(3);
    pushFront(1);
    lg[nlog++] = "front() = " + toStr(dq[0]) + "，back() = " + toStr(dq[dlen - 1]) +
                 "，长度 " + toStr(dlen);
    drawAll(0, dlen - 1, -1);
    wait(0.35);
    popFront();
    popBack();

    lg[nlog++] = "--- 左进右出 ---";
    drawAll(-1, -1, -1);
    wait(0.2);
    pushFront(9);
    popBack();

    lg[nlog++] = "--- 右进左出 ---";
    drawAll(-1, -1, -1);
    wait(0.2);
    pushBack(7);
    popFront();

    lg[nlog++] = "现在剩：";
    for (int i = 0; i < dlen; i++) lg[nlog - 1] += toStr(dq[i]) + " ";
    drawAll(-1, -1, -1);
    wait(0.3);

    printf("双向队列两头都能进出：左进右出、右进左出都可以，最后剩下 3 2 7。\\n");
    return 0;
}
`,
  },
  '单调栈：下一个更大元素与最大矩形（画图版）': {
    group: 'GoC 可视化·栈与队列',
    stdin: '',
    code: `// 单调栈：1) 下一个更大元素  2) 柱状图最大矩形
// 左边是柱状图（柱高就是数组里的数），右边一列格子是单调栈（栈里存下标）。
// 找更大元素时，栈顶被标黄并弹出来；求最大矩形时，把算出的矩形轮廓画在柱子上。
#include <goc.h>
#include <cstdio>
#include <string>

const int N = 8;
int a[8] = {4, 7, 3, 5, 2, 9, 6, 1};
int ngeVal[8];
bool ngeHas[8];
bool inStk[8];

const int M = 7;
int h[7] = {2, 1, 5, 6, 2, 3, 0};

int st[16];

double BASE = -280, X0 = -330, BW = 38, BG = 12;
double SC1 = 220.0 / 9.0, SC2 = 220.0 / 6.0;

double bx(int i) { return X0 + i * (BW + BG) + BW / 2; }

std::string toStr(int v) {
    if (v == 0) return "0";
    bool neg = v < 0;
    if (neg) v = -v;
    std::string s;
    while (v > 0) { s = char('0' + v % 10) + s; v /= 10; }
    if (neg) s = "-" + s;
    return s;
}

// ---- 局部重绘的脏跟踪 ----
int lastBarCol[8];
int lastNge[8];
int lastStkVal[16], lastStkCol[16], lastStkN = 0;
int lastRl = -99, lastRw = -99, lastRh = -99, lastShow = -1;
std::string lastTitle, lastMsg;

void ground() {
    pen.setAngle(0);
    pen.pu().moveTo(-370, BASE).pd().c(0).size(2).lineTo(380, BASE);
}

void putTitle(const std::string &s) {
    if (s == lastTitle) return;
    pen.setAngle(0);
    pen.pu().moveTo(-190, 280).pd().clsRec(380, 36);
    pen.pu().moveTo(-370, 280).pd().c(0).textL(s, 0, 24);
    lastTitle = s;
}
void putMsg(const std::string &s) {
    if (s == lastMsg) return;
    pen.setAngle(0);
    pen.pu().moveTo(-90, 120).pd().clsRec(580, 28);
    pen.pu().moveTo(-370, 120).pd().c(0).textL(s, 0, 18);
    lastMsg = s;
}

// 右边那列单调栈：一格一个槽，变短时把多出来的槽擦掉
void stkCell(int k, int col) {
    double y = BASE + 22 + 50 * k;
    pen.setAngle(0);
    pen.pu().moveTo(210, y).pd().clsRec(92, 48);
    pen.pu().moveTo(210, y).pd().c(col).size(2).rr(84, 44);
    pen.pu().moveTo(210, y).pd().c(0).text(st[k], 0, 22);
    lastStkVal[k] = st[k]; lastStkCol[k] = col;
}
void drawStackCol(int top, int cur) {
    for (int k = top; k < lastStkN; k++) {
        pen.setAngle(0);
        pen.pu().moveTo(210, BASE + 22 + 50 * k).pd().clsRec(92, 48);
    }
    for (int k = 0; k < top; k++) {
        int col = 3;
        if (k == top - 1) col = 5;      // 栈顶
        if (k == cur) col = 1;          // 本步要弹的
        if (k >= lastStkN || st[k] != lastStkVal[k] || col != lastStkCol[k]) stkCell(k, col);
    }
    lastStkN = top;
}

// 柱子高度固定、只换颜色：实心不透明，原位重画就能盖住旧的，不用擦
void barA(int j, int col) {
    double hgt = a[j] * SC1;
    pen.setAngle(0);
    pen.pu().moveTo(bx(j), BASE + hgt / 2).pd().c(col).size(2).rr(BW, hgt);
    pen.pu().moveTo(bx(j), BASE + hgt + 12).pd().c(0).text(a[j], 0, 15);
    lastBarCol[j] = col;
}
void barB(int j, int col) {
    double hgt = h[j] * SC2;
    pen.setAngle(0);
    pen.pu().moveTo(bx(j), BASE + hgt / 2).pd().c(col).size(2).rr(BW, hgt);
    pen.pu().moveTo(bx(j), BASE + hgt + 12).pd().c(0).text(h[j], 0, 15);
    lastBarCol[j] = col;
}

// 柱脚下面那个「下一个更大值」的小槽（在地平线下方，擦不到地平线）
void ngeLabel(int j) {
    int v = ngeHas[j] ? ngeVal[j] : -1;
    if (v == lastNge[j]) return;
    pen.setAngle(0);
    pen.pu().moveTo(bx(j), BASE - 26).pd().clsRec(30, 22);
    if (ngeHas[j]) pen.pu().moveTo(bx(j), BASE - 26).pd().c(4).text(ngeVal[j], 0, 14);
    else pen.pu().moveTo(bx(j), BASE - 26).pd().c(8).text("-", 0, 14);
    lastNge[j] = v;
}

// 第一部分：柱状图 + nge
void drawA(int cur, int top, const std::string &msg) {
    putTitle("单调栈 1：下一个更大元素");
    for (int j = 0; j < N; j++) {
        int col = 2;
        if (j == cur) col = 1;
        else if (inStk[j]) col = 3;
        if (col != lastBarCol[j]) barA(j, col);
        ngeLabel(j);
    }
    drawStackCol(top, cur);
    putMsg(msg);
}

// 最大矩形轮廓：换轮廓时先擦掉旧轮廓那块，再原位补画柱子，最后画新轮廓
void rectGeom(int rl, int rw, int rh, double &cx, double &w, double &hh) {
    w = rw * (BW + BG) - BG;
    hh = rh * SC2;
    cx = bx(rl) + (rw - 1) * (BW + BG) / 2;
}
void drawB(int cur, int top, int rl, int rw, int rh, bool showRect,
           const std::string &msg) {
    putTitle("单调栈 2：柱状图最大矩形");
    int col[8];
    for (int j = 0; j < M; j++) {
        col[j] = 2;
        if (j == cur) col[j] = 1;
        else if (j < M - 1 && inStk[j]) col[j] = 3;
    }
    bool show = showRect && rw > 0;
    bool changed = (show != (lastShow == 1)) ||
                   (show && (rl != lastRl || rw != lastRw || rh != lastRh));
    if (changed) {
        double cx, w, hh;
        if (lastShow == 1) {
            rectGeom(lastRl, lastRw, lastRh, cx, w, hh);
            pen.setAngle(0);
            pen.pu().moveTo(cx, BASE + hh / 2).pd().clsRec(w + 6, hh + 4);
        }
        ground();                                       // 擦除啃到的地平线补回来
        for (int j = 0; j < M; j++) barB(j, col[j]);    // 被擦掉的柱身原位补画
        if (show) {
            rectGeom(rl, rw, rh, cx, w, hh);
            pen.setAngle(0);
            pen.pu().moveTo(cx, BASE + hh / 2).pd().c(14).size(3).r(w, hh);
        }
        lastShow = show ? 1 : 0; lastRl = rl; lastRw = rw; lastRh = rh;
    } else {
        for (int j = 0; j < M; j++) if (col[j] != lastBarCol[j]) barB(j, col[j]);
    }
    drawStackCol(top, cur);
    putMsg(msg);
}

// 换部分时把标题以下的舞台整块擦一次（不是每帧），再铺这一部分的静态背景
void clearStage() {
    pen.setAngle(0);
    pen.pu().moveTo(0, -30).pd().clsRec(770, 660);
    for (int j = 0; j < 8; j++) { lastBarCol[j] = -1; lastNge[j] = -2; }
    lastStkN = 0;
    lastShow = -1; lastRl = -99; lastRw = -99; lastRh = -99;
    lastMsg = "";
}
void stageA() {
    ground();
    pen.pu().moveTo(-370, BASE - 60).pd().c(4).textL("柱子下面的小字 = 右边第一个更大的值", 0, 16);
    pen.pu().moveTo(210, 90).pd().c(0).textL("单调栈（存下标）", 0, 18);
}
void stageB() {
    ground();
    pen.pu().moveTo(210, 90).pd().c(0).textL("单调栈（存下标）", 0, 18);
}

int main() {
    pen.speed(10);
    for (int i = 0; i < N; i++) { ngeHas[i] = false; inStk[i] = false; }
    for (int j = 0; j < 8; j++) { lastBarCol[j] = -1; lastNge[j] = -2; }
    stageA();

    // ---- 第一部分：下一个更大元素 ----
    int top = 0;
    for (int i = 0; i < N; i++) {
        while (top > 0 && a[st[top - 1]] < a[i]) {
            int j = st[top - 1];
            drawA(j, top, "栈顶 a[" + toStr(j) + "]=" + toStr(a[j]) + " 比 a[" + toStr(i) +
                          "]=" + toStr(a[i]) + " 小，弹出它：它的下一个更大值就是 " + toStr(a[i]));
            wait(0.07);
            top--;
            inStk[j] = false;
            ngeVal[j] = a[i];
            ngeHas[j] = true;
        }
        st[top++] = i;
        inStk[i] = true;
        drawA(i, top, "压入下标 " + toStr(i) + "（值 " + toStr(a[i]) + "），栈里现在 " +
                      toStr(top) + " 个");
        wait(0.07);
    }
    drawA(-1, top, "扫完了：柱子下面就是每个位置右边第一个更大的值，-1 表示没有");
    wait(0.4);

    // ---- 第二部分：柱状图最大矩形 ----
    clearStage();
    stageB();
    for (int i = 0; i < M; i++) inStk[i] = false;
    top = 0;
    long long best = 0;
    int bestL = 0, bestW = 0, bestH = 0;
    for (int i = 0; i < M; i++) {
        while (top > 0 && h[st[top - 1]] > h[i]) {
            int j = st[top - 1];
            int height = h[j];
            int l = top > 1 ? st[top - 2] + 1 : 0;
            int width = i - l;
            long long area = (long long)height * width;
            if (area > best) { best = area; bestL = l; bestW = width; bestH = height; }
            drawB(j, top, l, width, height, true,
                  "弹出下标 " + toStr(j) + "（高 " + toStr(height) + "）：左边能扩到下标 " +
                  toStr(l) + "，宽度 " + toStr(width) + "，面积 " + toStr(area));
            wait(0.08);
            top--;
            inStk[j] = false;
        }
        st[top++] = i;
        inStk[i] = true;
        drawB(i, top, -1, 0, 0, false,
              "压入下标 " + toStr(i) + "（高 " + toStr(h[i]) + "）");
        wait(0.07);
    }
    drawB(-1, top, bestL, bestW, bestH, true,
          "最大矩形：高 " + toStr(bestH) + " x 宽 " + toStr(bestW) + "，面积 " + toStr(best));
    wait(0.4);

    printf("下一个更大元素：-1 -1 7 9 9 -1 9 -1\\n");
    printf("柱状图最大矩形面积 = %lld（高 %d x 宽 %d，从下标 %d 开始）\\n",
           best, bestH, bestW, bestL);
    return 0;
}
`,
  },
  '单调队列：滑动窗口最大值（画图版）': {
    group: 'GoC 可视化·栈与队列',
    stdin: '',
    code: `// 单调队列：滑动窗口最大值
// 上面是柱状图（柱高就是数组里的数），黄框是当前滑过去的窗口 k 格；
// 下面是单调队列：只存下标，值从队首到队尾单调递减，所以队首就是窗口最大值。
#include <goc.h>
#include <cstdio>
#include <string>

const int N = 10, K = 3;
int a[10] = {4, 2, 8, 5, 1, 9, 3, 7, 6, 0};
int q[16], head = 0, tail = 0;

double BASE = 60, BW = 42, BG = 12, SC = 18;
double bx(int i) { return -350 + BW / 2 + i * (BW + BG); }

std::string toStr(int v) {
    if (v == 0) return "0";
    bool neg = v < 0;
    if (neg) v = -v;
    std::string s;
    while (v > 0) { s = char('0' + v % 10) + s; v /= 10; }
    if (neg) s = "-" + s;
    return s;
}

// ---- 局部重绘的脏跟踪 ----
int lastBarCol[10];
int lastQVal[16], lastQCol[16], lastQN = 0;
int lastWinLo = -1, lastWinHi = -1;
double lastWinMxh = -1;
int lastMx = -1, lastHasMx = -1;
std::string lastRes, lastHeadLine, lastMsg;

void ground() {
    pen.setAngle(0);
    pen.pu().moveTo(-370, BASE).pd().c(0).size(2).lineTo(380, BASE);
}

// 柱子高度固定、只换颜色：实心不透明，原位重画盖住旧的
void bar(int i, int col) {
    double hgt = a[i] * SC;
    pen.setAngle(0);
    pen.pu().moveTo(bx(i), BASE + hgt / 2).pd().c(col).size(2).rr(BW, hgt);
    pen.pu().moveTo(bx(i), BASE + hgt + 12).pd().c(0).text(a[i], 0, 15);
    lastBarCol[i] = col;
}

// 窗口框：擦的时候只擦轮廓四条边（柱子和数字都在框外/框内，不碰）
void winFrame(int lo, int hi, double mxh, bool erase) {
    double x1 = bx(lo) - BW / 2 - 5, x2 = bx(hi) + BW / 2 + 5;
    double y1 = BASE - 6, y2 = BASE + mxh + 24;
    pen.setAngle(0);
    if (erase) {
        pen.pu().moveTo(x1, (y1 + y2) / 2).pd().clsRec(6, y2 - y1 + 6);
        pen.pu().moveTo(x2, (y1 + y2) / 2).pd().clsRec(6, y2 - y1 + 6);
        pen.pu().moveTo((x1 + x2) / 2, y2).pd().clsRec(x2 - x1 + 6, 6);
        pen.pu().moveTo((x1 + x2) / 2, y1).pd().clsRec(x2 - x1 + 6, 6);
    } else {
        pen.pu().moveTo((x1 + x2) / 2, (y1 + y2) / 2).pd().c(5).size(3).r(x2 - x1, y2 - y1);
    }
}

// 单调队列的一格：下标 + 下面对应的值，一起擦一起画
void qSlot(int j, int idx, int col) {
    double x = -370 + j * 58;
    pen.setAngle(0);
    pen.pu().moveTo(x, -74).pd().clsRec(56, 76);
    pen.pu().moveTo(x, -60).pd().c(col).size(2).rr(50, 42);
    pen.pu().moveTo(x, -60).pd().c(0).text(idx, 0, 20);
    pen.pu().moveTo(x, -100).pd().c(8).text(a[idx], 0, 16);
    lastQVal[j] = idx; lastQCol[j] = col;
}

void putText(const std::string &s, std::string &last,
             double cx, double cy, double w, double h, double tx, int col, int ts) {
    if (s == last) return;
    pen.setAngle(0);
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (!s.empty()) pen.pu().moveTo(tx, cy).pd().c(col).textL(s, 0, ts);
    last = s;
}

void drawAll(int cur, int mx, bool hasMx, const std::string &msg) {
    // 柱状图：只重画颜色变了的那几根
    for (int i = 0; i < N; i++) {
        int col = 2;
        if (i == cur) col = 5;                         // 刚进来的这个
        else if (head < tail && q[head] == i) col = 3; // 队首 = 当前最大值
        if (col != lastBarCol[i]) bar(i, col);
    }

    // 窗口框：位置或高度变了才擦旧框、补地平线、画新框
    int lo = -1, hi = -1;
    double mxh = 0;
    if (cur >= K - 1) {
        lo = cur - K + 1; hi = cur;
        for (int i = lo; i <= hi; i++) if (a[i] * SC > mxh) mxh = a[i] * SC;
    }
    if (lo != lastWinLo || hi != lastWinHi || mxh != lastWinMxh) {
        if (lastWinLo >= 0) winFrame(lastWinLo, lastWinHi, lastWinMxh, true);
        ground();                       // 竖边擦掉的地平线补回来
        if (lo >= 0) winFrame(lo, hi, mxh, false);
        lastWinLo = lo; lastWinHi = hi; lastWinMxh = mxh;
    }

    // 单调队列（下标）：按屏幕槽位记脏，队首滑出时整排左移也能对上
    int n = tail - head;
    for (int j = n; j < lastQN; j++) {
        pen.setAngle(0);
        pen.pu().moveTo(-370 + j * 58, -74).pd().clsRec(56, 76);
    }
    for (int j = 0; j < n; j++) {
        int col = (j == 0) ? 3 : 2;
        int idx = q[head + j];
        if (j >= lastQN || idx != lastQVal[j] || col != lastQCol[j]) qSlot(j, idx, col);
    }
    lastQN = n;
    putText(head < tail ? "队首（下标 " + toStr(q[head]) + "）就是当前窗口最大值" : std::string(""),
            lastHeadLine, -150, -160, 460, 26, -370, 3, 16);

    // 右侧面板：只有最大值和结果串会变
    if (mx != lastMx || (hasMx ? 1 : 0) != lastHasMx) {
        pen.setAngle(0);
        pen.pu().moveTo(260, 205).pd().clsRec(70, 46);
        if (hasMx) pen.pu().moveTo(260, 205).pd().c(3).text(mx, 0, 34);
        lastMx = mx; lastHasMx = hasMx ? 1 : 0;
    }
    std::string res = "";
    for (int i = K - 1; i < N; i++) res += toStr(a[q[i]]) + " ";
    putText(res, lastRes, 330, 115, 150, 26, 260, 0, 16);

    putText(msg, lastMsg, -140, -230, 480, 28, -370, 0, 18);
}

// 静态背景只画一次：标题、地平线、队列表头、右侧面板的固定标签
// （表头和面板都挪到了动态槽位外面，擦槽时碰不到）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-370, 280).pd().c(0).textL("单调队列：滑动窗口最大值", 0, 24);
    ground();
    pen.pu().moveTo(-370, -128).pd().c(0).textL("单调队列（存下标，值从队首到队尾递减）", 0, 18);
    pen.pu().moveTo(260, 290).pd().c(0).textL("窗口 k = 3", 0, 20);
    pen.pu().moveTo(260, 250).pd().c(0).textL("当前最大值：", 0, 18);
    pen.pu().moveTo(260, 150).pd().c(0).textL("依次得到：", 0, 18);
}

int main() {
    pen.speed(10);
    for (int i = 0; i < N; i++) lastBarCol[i] = -1;
    staticBg();
    int mx = 0;
    bool hasMx = false;
    for (int i = 0; i < N; i++) {
        // 入队前把队尾所有「不比当前大」的下标弹掉
        while (head < tail && a[q[tail - 1]] <= a[i]) {
            int j = q[tail - 1];
            tail--;
            drawAll(i, mx, hasMx, "队尾的下标 " + toStr(j) + "（值 " + toStr(a[j]) +
                                  "）不比 " + toStr(a[i]) + " 大又更旧，弹掉它");
            wait(0.06);
        }
        q[tail++] = i;
        drawAll(i, mx, hasMx, "新元素 " + toStr(a[i]) + "（下标 " + toStr(i) + "）压进队尾");
        wait(0.06);
        // 队头滑出窗口
        while (head < tail && q[head] <= i - K) {
            int j = q[head];
            head++;
            drawAll(i, mx, hasMx, "下标 " + toStr(j) + " 已经滑出窗口，从队首弹掉");
            wait(0.06);
        }
        if (i >= K - 1) {
            mx = a[q[head]];
            hasMx = true;
            drawAll(i, mx, hasMx, "窗口 [" + toStr(i - K + 1) + ", " + toStr(i) +
                                  "]，队首下标 " + toStr(q[head]) + " 的值 " + toStr(mx) + " 最大");
            wait(0.12);
        }
    }
    drawAll(N, mx, hasMx, "扫完了：每个窗口的最大值都在队首取出来");
    wait(0.4);

    printf("窗口大小 k=3，最大值依次为：8 8 9 9 9 7\\n");
    printf("（朴素 O(nk) 扫一遍的结果完全一样）\\n");
    return 0;
}
`,
  },
  '中缀转后缀并求值': {
    group: 'GoC 可视化·栈与队列',
    stdin: '',
    code: `// 数组栈：中缀转后缀并求值
// 上面一行是正在扫描的中缀式，红箭头指到当前字符；
// 下面一行是已经生成的后缀式；中间那一列格子是运算符栈（shunting-yard）。
#include <goc.h>
#include <cstdio>
#include <cstring>
#include <string>

const char *expr = "12 + 3 * (8 - 6) / 2";
const int MAXT = 32;
char post[MAXT][8];
int pn = 0;
char op[MAXT];
int opn = 0;
int val[MAXT], vn = 0;
std::string postLine = "";

int prec(char c) {
    if (c == '+' || c == '-') return 1;
    if (c == '*' || c == '/') return 2;
    return 0;
}

std::string toStr(int v) {
    if (v == 0) return "0";
    bool neg = v < 0;
    if (neg) v = -v;
    std::string s;
    while (v > 0) { s = char('0' + v % 10) + s; v /= 10; }
    if (neg) s = "-" + s;
    return s;
}

void pushPost(char c) {
    post[pn][0] = c;
    post[pn][1] = 0;
    pn++;
}

double ix(int i) { return -280 + i * 34; }
double px(int i) { return -340 + i * 46; }

// ---- 局部重绘的脏跟踪 ----
int lastInHi[24], lastInN = 0;
bool infixOn = true;
int lastPostHi[24], lastPostN = 0;
std::string lastStkTxt[16];
int lastStkCol[16], lastStkN = 0;
std::string lastInMsg, lastPostMsg, lastLabel, lastRowTag;
double lastLabelX = 0, lastLabelY = 0;

// 中缀行的一个槽：高亮框 + 字符 + 下面的红箭头一起擦一起画
void inSlot(int i, bool hi) {
    double x = ix(i);
    pen.setAngle(0);
    pen.pu().moveTo(x, 189).pd().clsRec(30, 64);       // 槽距 34，擦 30 不碰邻居
    std::string t(1, expr[i]);
    if (hi) pen.pu().moveTo(x, 200).pd().c(5).size(2).rr(30, 36);
    pen.pu().moveTo(x, 200).pd().c(0).text(t, 0, 24);
    if (hi) {
        pen.pu().moveTo(x, 166).pd().c(1).size(2);
        pen.polXY(x, 172).polXY(x - 8, 158).polXY(x + 8, 158).pol(1, 1);
        pen.polXY();
    }
}

// 说明行放在红箭头下方 132：整行宽槽，长消息的尾巴也擦得全
void putInMsg(const std::string &s) {
    if (s == lastInMsg) return;
    pen.setAngle(0);
    pen.pu().moveTo(0, 132).pd().clsRec(760, 28);
    if (!s.empty()) pen.pu().moveTo(-370, 132).pd().c(0).textL(s, 0, 17);
    lastInMsg = s;
}

// 行标签「中缀式」：放在中缀行左端的空档（标题让位 stdout 后挤不下副标题）
void putRowTag(const std::string &s) {
    if (s == lastRowTag) return;
    pen.setAngle(0);
    pen.pu().moveTo(-340, 200).pd().clsRec(70, 26);
    if (!s.empty()) pen.pu().moveTo(-370, 200).pd().c(0).textL(s, 0, 20);
    lastRowTag = s;
}

// 上面一行：中缀式，红箭头指当前字符
void drawInfix(int cur, const std::string &msg) {
    putInMsg(msg);
    if (!infixOn) return;                 // 求值阶段整行已擦掉，不再重画
    int n = 0;
    while (expr[n]) n++;
    for (int i = lastInN; i < n; i++) { inSlot(i, false); lastInHi[i] = 0; }
    for (int i = 0; i < n; i++) {
        int h = (i == cur) ? 1 : 0;
        if (h != lastInHi[i]) { inSlot(i, h == 1); lastInHi[i] = h; }
    }
    lastInN = n;
}

// 进入求值阶段：把中缀行整行擦干净（槽位+箭头+行标签），stdout 顶带下不留碎片
void clearInfix() {
    for (int i = 0; i < lastInN; i++) {
        pen.setAngle(0);
        pen.pu().moveTo(ix(i), 189).pd().clsRec(30, 64);
        lastInHi[i] = 0;
    }
    lastInN = 0;
    infixOn = false;
    putRowTag("");
}

// 中间那一列栈的一格
void stkSlot(int k, const std::string &t, int col, int ts) {
    double y = 90 - 46 * k;
    pen.setAngle(0);
    pen.pu().moveTo(-40, y).pd().clsRec(54, 48);       // 槽距 46，擦 48 刚好不碰邻居
    pen.pu().moveTo(-40, y).pd().c(col).size(2).rr(46, 40);
    pen.pu().moveTo(-40, y).pd().c(0).text(t, 0, ts);
    lastStkTxt[k] = t; lastStkCol[k] = col;
}
void drawStackCol(int n, std::string t[], int ts) {
    for (int k = n; k < lastStkN; k++) {
        pen.setAngle(0);
        pen.pu().moveTo(-40, 90 - 46 * k).pd().clsRec(54, 48);
    }
    for (int k = 0; k < n; k++) {
        int col = (k == n - 1) ? 5 : 3;
        if (k >= lastStkN || t[k] != lastStkTxt[k] || col != lastStkCol[k]) stkSlot(k, t[k], col, ts);
    }
    lastStkN = n;
}

// 栈的表头：两个部分位置不同，换的时候先擦旧槽
void putLabel(const std::string &s, double x, double y) {
    if (s == lastLabel && x == lastLabelX && y == lastLabelY) return;
    pen.setAngle(0);
    if (!lastLabel.empty()) pen.pu().moveTo(lastLabelX + 170, lastLabelY).pd().clsRec(360, 28);
    pen.pu().moveTo(x, y).pd().c(0).textL(s, 0, 18);
    lastLabel = s; lastLabelX = x; lastLabelY = y;
}

// 后缀行的一个槽：高亮框 + token + 下面的红箭头
void postSlot(int i, bool hi) {
    double x = px(i);
    pen.setAngle(0);
    pen.pu().moveTo(x, -125).pd().clsRec(42, 66);      // 槽距 46，擦 42 不碰邻居
    std::string t(post[i]);
    if (hi) pen.pu().moveTo(x, -110).pd().c(5).size(2).rr(36, 34);
    pen.pu().moveTo(x, -110).pd().c(0).text(t, 0, 20);
    if (hi) {
        pen.pu().moveTo(x, -136).pd().c(1).size(2);
        pen.polXY(x, -142).polXY(x - 8, -156).polXY(x + 8, -156).pol(1, 1);
        pen.polXY();
    }
}
void putPostMsg(const std::string &s) {
    if (s == lastPostMsg) return;
    pen.setAngle(0);
    pen.pu().moveTo(0, -215).pd().clsRec(760, 28);
    if (!s.empty()) pen.pu().moveTo(-370, -215).pd().c(0).textL(s, 0, 17);
    lastPostMsg = s;
}

// 下面一行：后缀式
void drawPost(int cur, const std::string &msg) {
    for (int i = lastPostN; i < pn; i++) { postSlot(i, false); lastPostHi[i] = 0; }
    for (int i = 0; i < pn; i++) {
        int h = (i == cur) ? 1 : 0;
        if (h != lastPostHi[i]) { postSlot(i, h == 1); lastPostHi[i] = h; }
    }
    lastPostN = pn;
    putPostMsg(msg);
}

void frame(int curInfix, int curPost, const char *stackLabel, const std::string &msg) {
    drawInfix(curInfix, msg);
    std::string t[16];
    for (int k = 0; k < opn; k++) t[k] = std::string(1, op[k]);
    drawStackCol(opn, t, 22);
    putLabel(stackLabel, 20, 90);
    putRowTag("中缀式");
    drawPost(curPost, msg);
}

// 静态背景只画一次：标题让位 stdout 三行（L=3 → 238），行标签改动态槽
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-370, 238).pd().c(0).textL("中缀转后缀并求值", 0, 24);
    pen.pu().moveTo(-370, -80).pd().c(0).textL("后缀式", 0, 20);
}

int main() {
    pen.speed(10);
    pn = 0; opn = 0; vn = 0;
    staticBg();
    int n = 0;
    while (expr[n]) n++;

    // ---- 第一步：中缀转后缀 ----
    for (int i = 0; i < n; i++) {
        char c = expr[i];
        std::string msg;
        if (c == ' ') {
            frame(i, -1, "运算符栈", "空格，跳过");
            wait(0.05);
            continue;
        }
        if (c >= '0' && c <= '9') {
            char buf[8];
            int k = 0;
            while (i < n && expr[i] >= '0' && expr[i] <= '9') buf[k++] = expr[i++];
            buf[k] = 0;
            i--;
            strcpy(post[pn++], buf);
            msg = std::string("读到数字 ") + buf + "：直接输出到后缀式";
        } else if (c == '(') {
            op[opn++] = c;
            msg = "读到左括号 '('：压进运算符栈";
        } else if (c == ')') {
            while (opn > 0 && op[opn - 1] != '(') pushPost(op[--opn]);
            if (opn > 0) { opn--; }
            msg = "读到右括号 ')'：把栈里的运算符弹到后缀式，直到遇到 '('，再丢掉 '('";
        } else {
            while (opn > 0 && op[opn - 1] != '(' && prec(op[opn - 1]) >= prec(c)) pushPost(op[--opn]);
            op[opn++] = c;
            msg = std::string("读到运算符 ") + c + "：先把优先级 >= 它的栈顶弹出去，再把它压栈";
        }
        frame(i, pn - 1, "运算符栈", msg);
        wait(0.09);
    }
    while (opn > 0) pushPost(op[--opn]);
    frame(n, -1, "运算符栈", "扫完了，把栈里剩下的运算符依次弹进后缀式");
    wait(0.3);

    // ---- 第二步：后缀求值 ----
    clearInfix();
    for (int i = 0; i < pn; i++) {
        std::string t(post[i]);
        std::string msg;
        if (t[0] >= '0' && t[0] <= '9') {
            int x = 0;
            for (size_t j = 0; j < t.size(); j++) x = x * 10 + (t[j] - '0');
            val[vn++] = x;
            msg = "后缀式读到操作数 " + toStr(x) + "：压进数值栈";
        } else {
            int b = val[--vn], a = val[--vn];
            int r = t[0] == '+' ? a + b : t[0] == '-' ? a - b : t[0] == '*' ? a * b : a / b;
            val[vn++] = r;
            msg = "后缀式读到运算符 " + t + "：弹出 " + toStr(a) + " 和 " + toStr(b) +
                  "，算出 " + toStr(r) + " 再压回";
        }
        drawInfix(-1, "");
        std::string tv[16];
        for (int k = 0; k < vn; k++) tv[k] = toStr(val[k]);
        drawStackCol(vn, tv, 20);
        putLabel("数值栈（后缀求值用）", -370, 215);
        drawPost(i, msg);
        wait(0.1);
    }
    drawInfix(-1, "");
    std::string tf[16];
    for (int k = 0; k < vn; k++) tf[k] = toStr(val[k]);
    drawStackCol(vn, tf, 20);
    putLabel("数值栈（后缀求值用）", -370, 215);
    drawPost(-1, "算完，栈里只剩结果 " + toStr(val[vn - 1]));
    wait(0.4);

    printf("中缀：%s\\n", expr);
    printf("后缀：12 3 8 6 - * 2 / +\\n");
    printf("求值结果 = %d（12 + 3*(8-6)/2 = 15）\\n", val[vn - 1]);
    return 0;
}
`,
  },
  '二叉树：三种遍历': {
    group: 'GoC 可视化·树与堆',
    stdin: '',
    code: `// 二叉树的三种遍历（先序 / 中序 / 后序）外加层序遍历。
// 节点按层摆：深度就是纵坐标，同一层按从左到右排开。
// 每访问一个节点就把它点亮，并在旁边标出这是第几个访问到的。
#include <goc.h>
#include <cstdio>
#include <string>

const int MAXN = 32;

struct Node {
    int val;
    int l, r;
};

Node nd[MAXN];
int nc = 0;
int root = -1;

int newNode(int v) {
    nd[nc].val = v;
    nd[nc].l = nd[nc].r = -1;
    return nc++;
}

// 按 BST 规则建树：左小右大
int insertNode(int p, int v) {
    if (p < 0) return newNode(v);
    if (v < nd[p].val) nd[p].l = insertNode(nd[p].l, v);
    else nd[p].r = insertNode(nd[p].r, v);
    return p;
}

int ord[MAXN], dep[MAXN], par[MAXN], oc;

void mark(int p, int d, int fa) {
    if (p < 0) return;
    dep[p] = d;
    par[p] = fa;
    mark(nd[p].l, d + 1, p);
    ord[p] = oc++;
    mark(nd[p].r, d + 1, p);
}

double X[MAXN], Y[MAXN];

// 排版：纵坐标 = 深度，横坐标按中序名次铺开（同层自然是从左到右）
void layout() {
    oc = 0;
    mark(root, 0, -1);
    for (int i = 0; i < nc; i++) {
        X[i] = (ord[i] - (nc - 1) / 2.0) * 72.0;
        Y[i] = 280 - dep[i] * 100.0;
    }
}

int seq[4][MAXN], seqlen[4];
int k0, k1, k2, k3;

void pre(int p) { if (p < 0) return; seq[0][k0++] = p; pre(nd[p].l); pre(nd[p].r); }
void ino(int p) { if (p < 0) return; ino(nd[p].l); seq[1][k1++] = p; ino(nd[p].r); }
void post(int p) { if (p < 0) return; post(nd[p].l); post(nd[p].r); seq[2][k2++] = p; }

void lvl(int p) {
    int q[MAXN], qh = 0, qt = 0;
    if (p < 0) return;
    q[qt++] = p;
    while (qh < qt) {
        int u = q[qh++];
        seq[3][k3++] = u;
        if (nd[u].l >= 0) q[qt++] = nd[u].l;
        if (nd[u].r >= 0) q[qt++] = nd[u].r;
    }
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 640;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                       // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

int hl = -1;              // 当前访问到的节点
int vis[MAXN];            // 每个节点的访问次序，0 表示还没访问
int cur = 0;              // 当前是第几种遍历
int showSum = 0;          // 1 = 画最后那张四种遍历结果的汇总图
std::string outp;
std::string res[4];
const char *tname[4] = {"先序", "中序", "后序", "层序"};

int nCol[MAXN], nVis[MAXN];        // 这一帧想要的节点状态
int lCol[MAXN], lVis[MAXN];        // 上一帧画出来的节点状态
int eW[MAXN], eC[MAXN];            // 入边（按孩子下标索引）的线宽 / 颜色
int leW[MAXN], leC[MAXN];
int dn[MAXN], pn[MAXN], de[MAXN], pe[MAXN];
std::string lName, lOut;
int sumDrawn = 0;

// 节点槽：圆圈 + 圈里的值 + 圈下方的访问次序标签（横距 72，槽宽 56 不碰邻居）
void paintNode(int i) {
    int col = nCol[i];
    int tc = (col == 2) ? 15 : 0;
    pen.setAngle(0);
    pen.pu().moveTo(X[i], Y[i]).pd().c(col).size(2).oo(19);
    pen.pu().moveTo(X[i], Y[i]).pd().c(tc).text(nd[i].val, tc, 16);
    if (nVis[i] > 0) pen.pu().moveTo(X[i], Y[i] - 30).pd().c(1).text(nVis[i], 1, 14);
}

void paintEdge(int p) {            // p 是孩子，边从 par[p] 连到 p
    pen.c(eC[p]);
    seg(X[par[p]], Y[par[p]], X[p], Y[p], eW[p]);
}

// 静态背景只画一次，且都在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-370, 330).pd().c(0).textL("二叉树：三种遍历", 0, 24);
}

void draw() {
    erN = 0;
    for (int i = 0; i < nc; i++) {
        int col = 2;                    // 蓝：还没访问
        if (vis[i] > 0) col = 3;        // 绿：已经访问过
        if (i == hl) col = 5;           // 黄：正访问这个
        nCol[i] = col; nVis[i] = vis[i];
        dn[i] = (nCol[i] != lCol[i] || nVis[i] != lVis[i]) ? 1 : 0;
        pn[i] = dn[i];
    }
    // 边：当前节点的左出边加粗；颜色沿用原版（汇总图里是绿色）
    for (int i = 0; i < nc; i++) {
        int p = nd[i].l;
        if (p >= 0) { eW[p] = (i == hl) ? 3 : 2; eC[p] = showSum ? 3 : 0; }
        p = nd[i].r;
        if (p >= 0) { eW[p] = 2; eC[p] = showSum ? 3 : 0; }
    }
    for (int p = 0; p < nc; p++) {
        de[p] = 0; pe[p] = 0;
        if (par[p] < 0) continue;
        if (eW[p] < leW[p]) de[p] = 1;              // 变细了原位盖不住，先擦走廊
        if (de[p] || eW[p] != leW[p] || eC[p] != leC[p]) pe[p] = 1;
    }

    // 动态文字槽：遍历名 / 输出串；汇总图只画一次
    if (showSum) {
        if (!sumDrawn) {
            eraseBox(-340, 305, 70, 30);
            eraseBox(-250, 258, 250, 30);
            for (int i = 0; i < 4; i++) {
                pen.pu().moveTo(-370, -150 - i * 42).pd().c(2).textL(tname[i], 2, 20);
                pen.pu().moveTo(-250, -150 - i * 42).pd().c(0).textL(res[i], 0, 18);
            }
            pen.pu().moveTo(-370, -320).pd().c(3).textL("BST 的中序遍历一定是升序", 3, 18);
            sumDrawn = 1;
        }
    } else {
        std::string nm = tname[cur];
        if (nm != lName) {
            eraseBox(-340, 305, 70, 30);
            pen.pu().moveTo(-370, 305).pd().c(2).textL(nm, 2, 22);
            lName = nm;
        }
        if (outp != lOut) {
            eraseBox(-250, 258, 250, 30);
            pen.pu().moveTo(-370, 258).pd().c(0).textL(outp, 0, 18);
            lOut = outp;
        }
    }

    // 擦：脏节点槽 + 要擦的边走廊
    for (int i = 0; i < nc; i++) if (dn[i]) eraseBox(X[i], Y[i] - 8, 56, 68);
    for (int p = 0; p < nc; p++) if (de[p]) eraseSeg(X[par[p]], Y[par[p]], X[p], Y[p]);

    // 补画：被擦到的边、被擦到的节点，以及补画边会盖到的端点节点
    for (int p = 0; p < nc; p++) {
        if (par[p] < 0 || pe[p]) continue;
        if (segHitEr(X[par[p]], Y[par[p]], X[p], Y[p], 3)) pe[p] = 1;
    }
    for (int i = 0; i < nc; i++) if (!pn[i] && rectHitEr(X[i], Y[i] - 8, 56, 68)) pn[i] = 1;
    for (int p = 0; p < nc; p++) if (pe[p] && par[p] >= 0) { pn[p] = 1; pn[par[p]] = 1; }

    for (int p = 0; p < nc; p++) if (pe[p] && par[p] >= 0) paintEdge(p);
    for (int i = 0; i < nc; i++) if (pn[i]) paintNode(i);

    for (int i = 0; i < nc; i++) { lCol[i] = nCol[i]; lVis[i] = nVis[i]; }
    for (int p = 0; p < nc; p++) if (par[p] >= 0) { leW[p] = eW[p]; leC[p] = eC[p]; }
}

int main() {
    pen.speed(10);
    drawStatic();
    int vals[9] = {8, 3, 10, 1, 6, 14, 4, 7, 13};
    for (int i = 0; i < 9; i++) root = insertNode(root, vals[i]);
    layout();

    k0 = k1 = k2 = k3 = 0;
    pre(root);
    ino(root);
    post(root);
    lvl(root);
    seqlen[0] = k0; seqlen[1] = k1; seqlen[2] = k2; seqlen[3] = k3;

    for (int t = 0; t < 4; t++) {
        cur = t;
        hl = -1;
        outp = "";
        for (int i = 0; i < MAXN; i++) vis[i] = 0;
        draw();
        wait(0.25);
        for (int s = 0; s < seqlen[t]; s++) {
            int node = seq[t][s];
            hl = node;
            vis[node] = s + 1;
            outp += std::to_string(nd[node].val) + " ";
            draw();
            wait(0.07);
        }
        res[t] = outp;
        hl = -1;
        draw();
        wait(0.2);
    }

    showSum = 1;
    outp = "";
    draw();
    wait(0.6);

    printf("四种遍历结果：先序 %s / 中序 %s / 后序 %s / 层序 %s\\n",
           res[0].c_str(), res[1].c_str(), res[2].c_str(), res[3].c_str());
    return 0;
}
`,
  },
  '二叉搜索树：插入删除与高度': {
    group: 'GoC 可视化·树与堆',
    stdin: '',
    code: `// 二叉搜索树（BST）：插入时沿查找路径高亮，删除时用右子树的后继顶替。
// 树的高度随时标在右上角。
#include <goc.h>
#include <cstdio>
#include <string>

const int MAXN = 64;

struct Node {
    int v;
    int l, r, p;
};

Node nd[MAXN];
int nc = 0;
int root = -1;

int newNode(int v, int p) {
    nd[nc].v = v;
    nd[nc].l = nd[nc].r = -1;
    nd[nc].p = p;
    return nc++;
}

int path[MAXN], plen;

// 找插入位置：返回可以挂新节点的父节点下标，同时把走过的路径记进 path[]
int findPos(int v) {
    plen = 0;
    if (root < 0) return -1;
    int cur = root;
    while (true) {
        path[plen++] = cur;
        if (v < nd[cur].v) {
            if (nd[cur].l < 0) return cur;
            cur = nd[cur].l;
        } else if (v > nd[cur].v) {
            if (nd[cur].r < 0) return cur;
            cur = nd[cur].r;
        } else {
            return -2;                 // 已经存在
        }
    }
}

int ord[MAXN], dep[MAXN], oc, alive;

void mark(int p, int d) {
    if (p < 0) return;
    dep[p] = d;
    alive++;
    mark(nd[p].l, d + 1);
    ord[p] = oc++;
    mark(nd[p].r, d + 1);
}

double X[MAXN], Y[MAXN];

void layout() {
    oc = 0;
    alive = 0;
    mark(root, 0);
    for (int i = 0; i < nc; i++) {
        if (nd[i].v == 0) continue;
        X[i] = (ord[i] - (alive - 1) / 2.0) * 62.0;
        Y[i] = 250 - dep[i] * 95.0;
    }
}

int height(int p) {
    if (p < 0) return 0;
    int a = height(nd[p].l), b = height(nd[p].r);
    return 1 + (a > b ? a : b);
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 900;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                       // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

int hl1 = -1, hl2 = -1;          // 高亮的两个节点
int inPath = 0;                  // 路径上的节点画成黄色
std::string msg;

int nOn[MAXN], nCol[MAXN];               // 这一帧想要的节点状态
int lOn[MAXN], lCol[MAXN], lV[MAXN];     // 上一帧画出来的节点状态
double lX[MAXN], lY[MAXN];               // 上一帧的位置（挪走了要擦旧槽）
int eOn[MAXN], eW[MAXN], eC[MAXN], ePar[MAXN];   // 入边按孩子下标索引
int leOn[MAXN], leW[MAXN], leC[MAXN];
double leX1[MAXN], leY1[MAXN], leX2[MAXN], leY2[MAXN];
int dn[MAXN], pn[MAXN], de[MAXN], pe[MAXN];
std::string lMsg;
int lH = -1;

// 节点槽：圆圈 r18 + 圈里的值（横距 62，槽宽 48 不碰邻居）
void paintNode(int i) {
    int col = nCol[i];
    int tc = (col == 2) ? 15 : 0;
    pen.setAngle(0);
    pen.pu().moveTo(X[i], Y[i]).pd().c(col).size(2).oo(18);
    pen.pu().moveTo(X[i], Y[i]).pd().c(tc).text(nd[i].v, tc, 15);
}

void paintEdge(int c) {                  // c 是孩子，边从 ePar[c] 连到 c
    pen.c(eC[c]);
    seg(X[ePar[c]], Y[ePar[c]], X[c], Y[c], eW[c]);
}

// 静态背景只画一次，且都在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-370, 330).pd().c(0).textL("二叉搜索树：插入删除与高度", 0, 24);
}

void draw() {
    erN = 0;
    int ec = msg.empty() ? 2 : 1;        // 沿用原版：seg 继承上一支笔的颜色
    for (int i = 0; i < MAXN; i++) {
        nOn[i] = 0; eOn[i] = 0; ePar[i] = -1;
        dn[i] = 0; pn[i] = 0; de[i] = 0; pe[i] = 0;
    }
    for (int i = 0; i < nc; i++) {
        if (!nd[i].v) continue;
        nOn[i] = 1;
        int col = 2;
        if (i == hl1 || i == hl2) col = 5;
        else if (inPath) {
            for (int k = 0; k < plen; k++)
                if (path[k] == i) { col = 5; break; }
        }
        nCol[i] = col;
        int c = nd[i].l;
        if (c >= 0) { eOn[c] = 1; ePar[c] = i; eW[c] = 2; eC[c] = ec; }
        c = nd[i].r;
        if (c >= 0) { eOn[c] = 1; ePar[c] = i; eW[c] = 2; eC[c] = ec; }
    }
    for (int i = 0; i < MAXN; i++) {
        if (!nOn[i]) { dn[i] = lOn[i]; continue; }      // 节点被删：擦掉旧槽
        dn[i] = (!lOn[i] || nCol[i] != lCol[i] || nd[i].v != lV[i]
                 || fabs(X[i] - lX[i]) > 0.01 || fabs(Y[i] - lY[i]) > 0.01) ? 1 : 0;
        pn[i] = dn[i];
    }
    for (int c = 0; c < MAXN; c++) {
        if (!eOn[c]) { de[c] = leOn[c]; continue; }     // 边被删：擦旧走廊
        if (!leOn[c]) { pe[c] = 1; continue; }          // 新边：直接画
        double x1 = X[ePar[c]], y1 = Y[ePar[c]], x2 = X[c], y2 = Y[c];
        int moved = (fabs(x1 - leX1[c]) > 0.01 || fabs(y1 - leY1[c]) > 0.01
                     || fabs(x2 - leX2[c]) > 0.01 || fabs(y2 - leY2[c]) > 0.01) ? 1 : 0;
        if (moved || eW[c] < leW[c]) { de[c] = 1; pe[c] = 1; }   // 几何变了盖不住
        else pe[c] = (eW[c] != leW[c] || eC[c] != leC[c]) ? 1 : 0; // 只变色：原位重画
    }

    // 动态文字槽：树高 / 提示语
    int hh = height(root);
    if (hh != lH) {
        eraseBox(280, 330, 120, 30);
        pen.pu().moveTo(230, 330).pd().c(2).textL("树高 = " + std::to_string(hh), 2, 20);
        lH = hh;
    }
    if (msg != lMsg) {
        eraseBox(-160, 300, 440, 30);
        if (!msg.empty()) pen.pu().moveTo(-370, 300).pd().c(1).textL(msg, 1, 20);
        lMsg = msg;
    }

    // 擦：脏节点的旧槽 + 要擦的边走廊
    for (int i = 0; i < MAXN; i++) if (dn[i] && lOn[i]) eraseBox(lX[i], lY[i], 48, 48);
    for (int c = 0; c < MAXN; c++) if (de[c]) eraseSeg(leX1[c], leY1[c], leX2[c], leY2[c]);

    // 补画：被擦到的边、被擦到的节点，以及补画边会盖到的端点节点
    for (int c = 0; c < MAXN; c++) {
        if (!eOn[c] || pe[c]) continue;
        if (segHitEr(X[ePar[c]], Y[ePar[c]], X[c], Y[c], 3)) pe[c] = 1;
    }
    for (int i = 0; i < MAXN; i++)
        if (nOn[i] && !pn[i] && rectHitEr(X[i], Y[i], 48, 48)) pn[i] = 1;
    for (int c = 0; c < MAXN; c++) if (pe[c] && eOn[c]) { pn[c] = 1; pn[ePar[c]] = 1; }

    for (int c = 0; c < MAXN; c++) if (pe[c] && eOn[c]) paintEdge(c);
    for (int i = 0; i < MAXN; i++) if (pn[i] && nOn[i]) paintNode(i);

    for (int i = 0; i < MAXN; i++) {
        lOn[i] = nOn[i];
        if (nOn[i]) { lCol[i] = nCol[i]; lV[i] = nd[i].v; lX[i] = X[i]; lY[i] = Y[i]; }
    }
    for (int c = 0; c < MAXN; c++) {
        leOn[c] = eOn[c];
        if (eOn[c]) {
            leW[c] = eW[c]; leC[c] = eC[c];
            leX1[c] = X[ePar[c]]; leY1[c] = Y[ePar[c]]; leX2[c] = X[c]; leY2[c] = Y[c];
        }
    }
}

// 删掉节点 x（三种情况都在这里处理）
void removeNode(int x) {
    int p = nd[x].p;
    if (nd[x].l >= 0 && nd[x].r >= 0) {
        int s = nd[x].r;
        while (nd[s].l >= 0) s = nd[s].l;      // 右子树的最小值 = 后继
        nd[x].v = nd[s].v;
        int sp = nd[s].p;
        if (sp == x) nd[x].r = nd[s].r;
        else nd[sp].l = nd[s].r;
        if (nd[s].r >= 0) nd[nd[s].r].p = sp;
        nd[s].v = 0;
        nd[s].l = nd[s].r = nd[s].p = -1;
        return;
    }
    int ch = (nd[x].l >= 0) ? nd[x].l : nd[x].r;
    if (ch >= 0) nd[ch].p = p;
    if (p < 0) root = ch;
    else if (nd[p].l == x) nd[p].l = ch;
    else nd[p].r = ch;
    nd[x].v = 0;
    nd[x].l = nd[x].r = nd[x].p = -1;
}

int findNode(int v) {
    int cur = root;
    while (cur >= 0) {
        if (v == nd[cur].v) return cur;
        cur = (v < nd[cur].v) ? nd[cur].l : nd[cur].r;
    }
    return -1;
}

int main() {
    pen.speed(10);
    drawStatic();
    int vals[9] = {50, 30, 70, 20, 40, 60, 80, 35, 45};
    for (int i = 0; i < 9; i++) {
        int v = vals[i];
        int p = findPos(v);
        if (p == -2) continue;
        if (p < 0) {
            root = newNode(v, -1);
        } else {
            int id = newNode(v, p);
            if (v < nd[p].v) nd[p].l = id;
            else nd[p].r = id;
        }
        layout();
        msg = "插入 " + std::to_string(v) + "：沿查找路径走到空位";
        hl1 = -1; hl2 = -1; inPath = 1;
        draw();
        wait(0.12);
        hl1 = (nc > 0) ? nc - 1 : -1;
        inPath = 0;
        msg = "插入 " + std::to_string(v) + " 完成";
        draw();
        wait(0.12);
    }

    msg = "";
    hl1 = -1; hl2 = -1;
    layout();
    draw();
    wait(0.2);

    // 删 30：它有两个孩子，用右子树最小值 40 的左孩子…实际后继是 35
    int n30 = findNode(30);
    hl1 = n30;
    msg = "删除 30：它有两个孩子，要用后继顶替";
    layout();
    draw();
    wait(0.3);
    int succ = nd[n30].r;
    while (nd[succ].l >= 0) succ = nd[succ].l;
    hl1 = n30; hl2 = succ;
    msg = "后继是右子树里最小的 " + std::to_string(nd[succ].v) + "，让它顶上去";
    draw();
    wait(0.35);
    removeNode(n30);
    hl1 = hl2 = -1;
    msg = "顶替完成：30 的位置现在是 " + std::to_string(nd[n30].v);
    layout();
    draw();
    wait(0.3);

    // 删叶子 20 和 80
    int dele[2] = {20, 80};
    for (int i = 0; i < 2; i++) {
        int x = findNode(dele[i]);
        hl1 = x;
        msg = "删除 " + std::to_string(dele[i]) + "：它是叶子，直接摘掉";
        draw();
        wait(0.3);
        removeNode(x);
        hl1 = -1;
        msg = "删除 " + std::to_string(dele[i]) + " 完成";
        layout();
        draw();
        wait(0.25);
    }

    msg = "";
    layout();
    draw();
    wait(0.3);
    printf("删完 30、20、80 之后，树里还剩 %d 个节点，树高 %d。\\n", alive, height(root));
    return 0;
}
`,
  },
  '堆：合并果子': {
    group: 'GoC 可视化·树与堆',
    stdin: '',
    code: `// 合并果子：用小顶堆每次取最小的两堆合并，这正是哈夫曼的贪心。
// 画面上把堆画成一棵完全二叉树，每次合并都标出取出的两个和调整（sift）的路径。
#include <goc.h>
#include <cstdio>
#include <string>

const int CAP = 32;
int heap[CAP];
int hn = 0;

int hi = -1, hj = -1;          // 高亮的两个下标
int hpath[CAP], hplen;         // sift 走过的路径
std::string msg;

double hx(int i) {             // 堆里第 i 个元素在树上的横坐标
    int lv = 0;
    while ((1 << (lv + 1)) - 1 <= i) lv++;
    int first = (1 << lv) - 1;
    int k = i - first;
    int cnt = 1 << lv;
    return (k - (cnt - 1) / 2.0) * 78.0;
}

double hy(int i) {
    int lv = 0;
    while ((1 << (lv + 1)) - 1 <= i) lv++;
    return 230 - lv * 90.0;
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 900;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                       // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

int nOn[CAP], nCol[CAP];                 // 树上的圆圈
int lOn[CAP], lCol[CAP], lV[CAP];
int cOn[CAP], cCol[CAP], cV[CAP];        // 下面的数组格子
int lcOn[CAP], lcCol[CAP], lcV[CAP];
int eOn[CAP], eC[CAP], leOn[CAP], leC[CAP];
int dn[CAP], pn[CAP], dc[CAP], pc[CAP], de[CAP], pe[CAP];
std::string lMsg;

int nodeCol(int i) {
    if (i == hi || i == hj) return 5;
    for (int k = 0; k < hplen; k++) if (hpath[k] == i) return 5;
    return 2;
}

// 节点槽：圆圈 r18 + 值（同层横距 78，槽宽 48 不碰邻居）
void paintNode(int i) {
    int col = nCol[i];
    int tc = (col == 2) ? 15 : 0;
    pen.setAngle(0);
    pen.pu().moveTo(hx(i), hy(i)).pd().c(col).size(2).oo(18);
    pen.pu().moveTo(hx(i), hy(i)).pd().c(tc).text(heap[i], tc, 15);
}

// 格子槽：外框 38x26 + 值 + 下方下标（横距 44，槽宽 42 不碰邻居）
void paintCell(int i) {
    double x = -250 + i * 44;
    pen.setAngle(0);
    pen.pu().moveTo(x, -290).pd().c(cCol[i]).size(2).r(38, 26);
    pen.pu().moveTo(x, -290).pd().c(0).text(heap[i], 0, 15);
    pen.pu().moveTo(x, -318).pd().c(0).text(i, 0, 12);
}

void paintEdge(int i) {                  // i 是孩子，父节点是 (i-1)/2
    int p = (i - 1) / 2;
    pen.c(eC[i]);
    seg(hx(p), hy(p), hx(i), hy(i), 2);
}

// 静态背景只画一次，且都在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-370, 280).pd().c(0).textL("堆：合并果子（优先队列）", 0, 24);
    pen.pu().moveTo(-370, -290).pd().c(0).textL("堆数组：", 0, 17);
}

void draw() {
    erN = 0;
    int ec = msg.empty() ? 0 : 1;        // 沿用原版：seg 继承上一支笔的颜色
    for (int i = 0; i < CAP; i++) {
        nOn[i] = 0; cOn[i] = 0; eOn[i] = 0;
        dn[i] = 0; pn[i] = 0; dc[i] = 0; pc[i] = 0; de[i] = 0; pe[i] = 0;
    }
    for (int i = 0; i < hn; i++) {
        nOn[i] = 1; cOn[i] = 1;
        nCol[i] = nodeCol(i); cCol[i] = nCol[i];
        if (i > 0) { eOn[i] = 1; eC[i] = ec; }
    }
    for (int i = 0; i < CAP; i++) {
        if (!nOn[i]) { dn[i] = lOn[i]; dc[i] = lcOn[i]; continue; }   // 出堆：擦掉旧槽
        dn[i] = (!lOn[i] || nCol[i] != lCol[i] || heap[i] != lV[i]) ? 1 : 0;
        dc[i] = (!lcOn[i] || cCol[i] != lcCol[i] || heap[i] != lcV[i]) ? 1 : 0;
        pn[i] = dn[i]; pc[i] = dc[i];
    }
    for (int i = 1; i < CAP; i++) {
        if (!eOn[i]) { de[i] = leOn[i]; continue; }
        if (!leOn[i]) { pe[i] = 1; continue; }
        pe[i] = (eC[i] != leC[i]) ? 1 : 0;      // 几何不变，只变色：原位重画盖旧
    }

    // 动态文字槽：提示语（挪到树与数组之间的空档，给 stdout 两行让出顶带）
    if (msg != lMsg) {
        eraseBox(-140, -160, 480, 30);
        if (!msg.empty()) pen.pu().moveTo(-370, -160).pd().c(1).textL(msg, 1, 19);
        lMsg = msg;
    }

    // 擦：脏节点槽 + 脏格子槽 + 要擦的边走廊
    for (int i = 0; i < CAP; i++) {
        if (dn[i]) eraseBox(hx(i), hy(i), 48, 48);
        if (dc[i]) eraseBox(-250 + i * 44, -300, 42, 56);
    }
    for (int i = 1; i < CAP; i++)
        if (de[i]) eraseSeg(hx((i - 1) / 2), hy((i - 1) / 2), hx(i), hy(i));

    // 补画：被擦到的边、被擦到的节点，以及补画边会盖到的端点节点
    for (int i = 1; i < CAP; i++) {
        if (!eOn[i] || pe[i]) continue;
        int p = (i - 1) / 2;
        if (segHitEr(hx(p), hy(p), hx(i), hy(i), 3)) pe[i] = 1;
    }
    for (int i = 0; i < CAP; i++)
        if (nOn[i] && !pn[i] && rectHitEr(hx(i), hy(i), 48, 48)) pn[i] = 1;
    for (int i = 1; i < CAP; i++) if (pe[i] && eOn[i]) { pn[i] = 1; pn[(i - 1) / 2] = 1; }

    for (int i = 1; i < CAP; i++) if (pe[i] && eOn[i]) paintEdge(i);
    for (int i = 0; i < CAP; i++) if (pn[i] && nOn[i]) paintNode(i);
    for (int i = 0; i < CAP; i++) if (pc[i] && cOn[i]) paintCell(i);

    for (int i = 0; i < CAP; i++) {
        lOn[i] = nOn[i]; lcOn[i] = cOn[i]; leOn[i] = eOn[i];
        if (nOn[i]) { lCol[i] = nCol[i]; lV[i] = heap[i]; }
        if (cOn[i]) { lcCol[i] = cCol[i]; lcV[i] = heap[i]; }
        if (eOn[i]) leC[i] = eC[i];
    }
}

// 入堆：先塞到末尾，再一路上浮
void hpush(int x) {
    int i = hn++;
    heap[i] = x;
    hplen = 0;
    while (i > 0) {
        int p = (i - 1) / 2;
        hpath[hplen++] = i;
        hpath[hplen++] = p;
        if (heap[p] <= heap[i]) break;
        int t = heap[p]; heap[p] = heap[i]; heap[i] = t;
        i = p;
    }
}

// 出堆：堆顶换到末尾，末尾那个再下沉，返回弹出的值
int hpop() {
    if (hn == 0) return 0;
    int top = heap[0];
    heap[0] = heap[--hn];
    hplen = 0;
    int i = 0;
    while (true) {
        int l = 2 * i + 1, r = 2 * i + 2, s = i;
        if (l < hn && heap[l] < heap[s]) s = l;
        if (r < hn && heap[r] < heap[s]) s = r;
        if (s == i) break;
        hpath[hplen++] = i;
        hpath[hplen++] = s;
        int t = heap[i]; heap[i] = heap[s]; heap[s] = t;
        i = s;
    }
    return top;
}

int main() {
    pen.speed(10);
    drawStatic();
    int w[8] = {1, 3, 5, 2, 8, 4, 7, 6};

    msg = "把 8 堆果子依次放进小顶堆（插入后一路上浮）";
    for (int i = 0; i < 8; i++) {
        hpush(w[i]);
        draw();
        wait(0.1);
    }
    hplen = 0;
    msg = "小顶堆建好了，堆顶永远是当前最小的";
    draw();
    wait(0.3);

    long long cost = 0;
    std::string log;
    while (hn > 1) {
        int a = hpop();
        hi = 0; hj = 1;
        msg = "取出最小的两堆：" + std::to_string(a) + " 和 " + std::to_string(heap[0]);
        draw();
        wait(0.2);
        int b = hpop();
        hi = hj = -1;
        msg = "合并：" + std::to_string(a) + " + " + std::to_string(b) + " = " + std::to_string(a + b);
        log += std::to_string(a) + "+" + std::to_string(b) + "=" + std::to_string(a + b) + " ";
        cost += a + b;
        hpush(a + b);
        draw();
        wait(0.25);
        hplen = 0;
        msg = "把 " + std::to_string(a + b) + " 放回堆里，再下沉调整";
        draw();
        wait(0.2);
    }

    hplen = 0;
    hi = hj = -1;
    msg = "合并完成：8 堆合成 1 堆，堆顶 = " + std::to_string(heap[0]);
    draw();
    wait(0.3);
    // 终态结果展示：只画一次，落在树与数组之间的空档，不碰任何动态槽位
    pen.setAngle(0);
    pen.pu().moveTo(-370, -120).pd().c(0).textL("合并过程：" + log, 0, 15);
    pen.pu().moveTo(-370, -200).pd().c(3).textL("最小总代价 = " + std::to_string(cost), 3, 20);
    wait(0.4);
    printf("合并过程：%s\\n", log.c_str());
    printf("最小总代价 = %lld\\n", cost);
    return 0;
}
`,
  },
  '二叉树：初始化与节点插入删除（画图版）': {
    group: 'GoC 可视化·树与堆',
    stdin: '',
    code: `// 普通二叉树（不是 BST）：节点 = 值 + 左孩子 + 右孩子。
// 动画演示：在父子之间插入节点 P(0)，删除 P 时把它的孩子改接到父亲那边。
// 颜色：蓝 = 普通节点，黄 = 正在操作的边 / 节点，绿 = 刚插好的新节点，红 = 正要删除的节点。
#include <goc.h>
#include <cstdio>
#include <string>

const int MAXN = 8;
struct Node { int val, l, r; };
Node nd[MAXN];
int alive[MAXN];
double X[MAXN], Y[MAXN];
int ord[MAXN], dep[MAXN], oc, cnt;
std::string msg, inoStr;
int hlA = -1, hlB = -1;      // 高亮的两个节点
int hlEdge = -1;             // 高亮边的父亲一端
int greenNode = -1;          // 新插入的节点标绿

void mark(int p, int d) {
    if (p < 0 || !alive[p]) return;
    dep[p] = d;
    mark(nd[p].l, d + 1);
    ord[p] = oc++;
    mark(nd[p].r, d + 1);
}

// 排版：横坐标按中序名次铺开，纵坐标按深度，插入 / 删除后重新布局
void layout() {
    oc = 0;
    mark(0, 0);
    cnt = oc;
    for (int i = 0; i < MAXN; i++) {
        if (!alive[i]) continue;
        X[i] = (ord[i] - (cnt - 1) / 2.0) * 90.0;
        Y[i] = 260 - dep[i] * 100.0;
    }
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 900;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                       // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

int nOn[MAXN], nCol[MAXN];               // 这一帧想要的节点状态
int lOn[MAXN], lCol[MAXN], lV[MAXN];     // 上一帧画出来的节点状态
double lX[MAXN], lY[MAXN];               // 上一帧的位置（挪走了要擦旧槽）
int eOn[MAXN], eW[MAXN], eC[MAXN], ePar[MAXN];   // 入边按孩子下标索引
int leOn[MAXN], leW[MAXN], leC[MAXN];
double leX1[MAXN], leY1[MAXN], leX2[MAXN], leY2[MAXN];
int dn[MAXN], pn[MAXN], de[MAXN], pe[MAXN];
std::string lMsg, lIno;

// 节点槽：圆圈 r20 + 值（横距 90，槽宽 52 不碰邻居）
void paintNode(int i) {
    int col = nCol[i];
    int tc = (col == 2) ? 15 : 0;
    pen.setAngle(0);
    pen.pu().moveTo(X[i], Y[i]).pd().c(col).size(2).oo(20);
    pen.pu().moveTo(X[i], Y[i]).pd().c(tc).text(nd[i].val, tc, 17);
}

void paintEdge(int c) {                  // c 是孩子，边从 ePar[c] 连到 c
    pen.c(eC[c]);
    seg(X[ePar[c]], Y[ePar[c]], X[c], Y[c], eW[c]);
}

// 静态背景只画一次，且都在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("二叉树：初始化与节点插入删除", 0, 26);
    pen.pu().moveTo(-350, -340).pd().c(8).textL("普通二叉树：插入 = 接在父子之间，删除 = 孩子改接父亲", 8, 15);
}

void draw() {
    erN = 0;
    int ec = msg.empty() ? 0 : 1;        // 沿用原版：seg 继承上一支笔的颜色
    for (int i = 0; i < MAXN; i++) {
        nOn[i] = 0; eOn[i] = 0; ePar[i] = -1;
        dn[i] = 0; pn[i] = 0; de[i] = 0; pe[i] = 0;
    }
    for (int i = 0; i < MAXN; i++) {
        if (!alive[i]) continue;
        nOn[i] = 1;
        int col = 2;                          // 蓝：普通
        if (i == hlA || i == hlB) col = 5;    // 黄：正在操作
        if (i == greenNode) col = 3;          // 绿：新插入
        if (i == hlA && greenNode < 0 && hlB < 0) col = 1;  // 红：待删除
        nCol[i] = col;
        int c = nd[i].l;
        if (c >= 0 && alive[c]) { eOn[c] = 1; ePar[c] = i; eW[c] = (i == hlEdge) ? 4 : 2; eC[c] = ec; }
        c = nd[i].r;
        if (c >= 0 && alive[c]) { eOn[c] = 1; ePar[c] = i; eW[c] = (i == hlEdge) ? 4 : 2; eC[c] = ec; }
    }
    for (int i = 0; i < MAXN; i++) {
        if (!nOn[i]) { dn[i] = lOn[i]; continue; }      // 节点被删：擦掉旧槽
        dn[i] = (!lOn[i] || nCol[i] != lCol[i] || nd[i].val != lV[i]
                 || fabs(X[i] - lX[i]) > 0.01 || fabs(Y[i] - lY[i]) > 0.01) ? 1 : 0;
        pn[i] = dn[i];
    }
    for (int c = 0; c < MAXN; c++) {
        if (!eOn[c]) { de[c] = leOn[c]; continue; }     // 边被删：擦旧走廊
        if (!leOn[c]) { pe[c] = 1; continue; }          // 新边：直接画
        double x1 = X[ePar[c]], y1 = Y[ePar[c]], x2 = X[c], y2 = Y[c];
        int moved = (fabs(x1 - leX1[c]) > 0.01 || fabs(y1 - leY1[c]) > 0.01
                     || fabs(x2 - leX2[c]) > 0.01 || fabs(y2 - leY2[c]) > 0.01) ? 1 : 0;
        if (moved || eW[c] < leW[c]) { de[c] = 1; pe[c] = 1; }   // 变细 / 挪位盖不住
        else pe[c] = (eW[c] != leW[c] || eC[c] != leC[c]) ? 1 : 0; // 只变色变粗：原位重画
    }

    // 动态文字槽：提示语 / 中序遍历结果
    if (msg != lMsg) {
        eraseBox(-130, 295, 460, 24);
        if (!msg.empty()) pen.pu().moveTo(-350, 295).pd().c(1).textL(msg, 1, 19);
        lMsg = msg;
    }
    if (inoStr != lIno) {
        eraseBox(-240, -300, 240, 30);
        pen.pu().moveTo(-350, -300).pd().c(0).textL("中序遍历：" + inoStr, 0, 20);
        lIno = inoStr;
    }

    // 擦：脏节点的旧槽 + 要擦的边走廊
    for (int i = 0; i < MAXN; i++) if (dn[i] && lOn[i]) eraseBox(lX[i], lY[i], 52, 52);
    for (int c = 0; c < MAXN; c++) if (de[c]) eraseSeg(leX1[c], leY1[c], leX2[c], leY2[c]);

    // 补画：被擦到的边、被擦到的节点，以及补画边会盖到的端点节点
    for (int c = 0; c < MAXN; c++) {
        if (!eOn[c] || pe[c]) continue;
        if (segHitEr(X[ePar[c]], Y[ePar[c]], X[c], Y[c], 3)) pe[c] = 1;
    }
    for (int i = 0; i < MAXN; i++)
        if (nOn[i] && !pn[i] && rectHitEr(X[i], Y[i], 52, 52)) pn[i] = 1;
    for (int c = 0; c < MAXN; c++) if (pe[c] && eOn[c]) { pn[c] = 1; pn[ePar[c]] = 1; }

    for (int c = 0; c < MAXN; c++) if (pe[c] && eOn[c]) paintEdge(c);
    for (int i = 0; i < MAXN; i++) if (pn[i] && nOn[i]) paintNode(i);

    for (int i = 0; i < MAXN; i++) {
        lOn[i] = nOn[i];
        if (nOn[i]) { lCol[i] = nCol[i]; lV[i] = nd[i].val; lX[i] = X[i]; lY[i] = Y[i]; }
    }
    for (int c = 0; c < MAXN; c++) {
        leOn[c] = eOn[c];
        if (eOn[c]) {
            leW[c] = eW[c]; leC[c] = eC[c];
            leX1[c] = X[ePar[c]]; leY1[c] = Y[ePar[c]]; leX2[c] = X[c]; leY2[c] = Y[c];
        }
    }
}

void inorder(int p, std::string &s) {
    if (p < 0 || !alive[p]) return;
    inorder(nd[p].l, s);
    s += std::to_string(nd[p].val) + " ";
    inorder(nd[p].r, s);
}

int main() {
    pen.speed(10);
    drawStatic();
    // 初始化：n1..n5 对应下标 0..4，与原版完全一致
    int vals[5] = {1, 2, 3, 4, 5};
    for (int i = 0; i < 5; i++) {
        nd[i].val = vals[i];
        nd[i].l = nd[i].r = -1;
        alive[i] = 1;
    }
    nd[0].l = 1; nd[0].r = 2;      // 1 的左右孩子是 2、3
    nd[1].l = 3; nd[1].r = 4;      // 2 的左右孩子是 4、5
    nd[5].val = 0; nd[5].l = nd[5].r = -1; alive[5] = 0;   // 待插入的 P(0)

    layout();
    inoStr = ""; inorder(0, inoStr);
    msg = "初始化二叉树：1 为根，左 2 右 3，2 下面挂 4、5";
    draw();
    wait(0.7);

    // 插入：在 1 -> 2 这条边中间插入 P(0)
    hlEdge = 0; hlA = 0; hlB = 1;
    msg = "插入 0：选中边 1 -> 2，把 P 插进父子之间";
    draw();
    wait(0.6);
    alive[5] = 1;
    nd[0].l = 5;                   // n1->left = P
    nd[5].l = 1;                   // P->left = n2
    layout();
    hlEdge = -1; hlA = -1; hlB = -1; greenNode = 5;
    inoStr = ""; inorder(0, inoStr);
    msg = "改接两条指针：1->left = P，P->left = 2";
    draw();
    wait(0.7);

    // 删除：摘掉 P，把它的孩子 2 直接接回父亲 1
    greenNode = -1; hlA = 5;
    msg = "删除 0：P 只有一个孩子 2，让孩子改接父亲";
    draw();
    wait(0.6);
    nd[0].l = 1;                   // n1->left = n2
    alive[5] = 0;
    layout();
    hlA = -1; hlEdge = 0;
    inoStr = ""; inorder(0, inoStr);
    msg = "1->left 直接指回 2，P 被摘掉，树恢复原样";
    draw();
    wait(0.7);

    hlEdge = -1;
    msg = "完成：插入再删除，中序遍历回到最初的结果";
    draw();
    wait(0.5);
    printf("中序遍历：初始化 %s/ 插入 0 后 4 2 5 0 1 3 / 删除 0 后回到 4 2 5 1 3\\n", inoStr.c_str());
    return 0;
}
`,
  },
  '二叉树的数组表示（画图版）': {
    group: 'GoC 可视化·树与堆',
    stdin: '',
    code: `// 二叉树的数组表示：左边是数组格子（下标 0..14），右边是对应的树。
// 逐个点亮映射「下标 i 的左孩子 = 2i+1、右孩子 = 2i+2」，空位用 INT_MAX 标记。
// 颜色：黄 = 当前下标 i，橙 = 它的两个孩子，绿 = 已点亮的映射，灰 = 空位。
#include <goc.h>
#include <cstdio>
#include <climits>
#include <string>

const int N = 15;
int tree[N] = {1, 2, 3, 4, INT_MAX, 6, 7, 8, 9, INT_MAX, INT_MAX, 12, INT_MAX, INT_MAX, 15};

double tx(int i) {                       // 树上第 i 格的横坐标（完全二叉树摆法）
    int lv = 0;
    while ((1 << (lv + 1)) - 1 <= i) lv++;
    int first = (1 << lv) - 1, cnt = 1 << lv;
    return 120.0 + (i - first - (cnt - 1) / 2.0) * (496.0 / cnt);
}
double ty(int i) {
    int lv = 0;
    while ((1 << (lv + 1)) - 1 <= i) lv++;
    return 250.0 - lv * 105.0;
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 900;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                       // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

int cur = -1;                            // 当前点亮的下标
int done[N];                             // 1 = 已经点亮过

int nCol[N], lCol[N];                    // 树圈颜色：这一帧 / 上一帧
int cCol[N], lcCol[N];                   // 数组格子颜色
int eW[N], leW[N];                       // 入边（按孩子下标索引）线宽，颜色恒为 0
int dn[N], pn[N], dc[N], pc[N], de[N], pe[N];
std::string lS;

int cellCol(int i, int l, int r) {
    int col = 8;                                  // 灰：空位
    if (tree[i] != INT_MAX) col = done[i] ? 3 : 2;
    if (i == cur) col = 5;                        // 黄：当前 i
    else if (i == l || i == r) col = 14;          // 橙：i 的孩子
    return col;
}

// 树圈槽：圆圈 r17 + 值 + 下方下标（最密一层横距 62，槽宽 48 不碰邻居）
void paintNode(int i) {
    int col = nCol[i];
    pen.setAngle(0);
    pen.pu().moveTo(tx(i), ty(i)).pd().c(col).size(2).oo(17);
    if (tree[i] == INT_MAX) {
        pen.pu().moveTo(tx(i), ty(i)).pd().c(8).text("空", 8, 12);
    } else {
        int tc = (col == 2) ? 15 : 0;
        pen.pu().moveTo(tx(i), ty(i)).pd().c(tc).text(tree[i], tc, 14);
    }
    pen.pu().moveTo(tx(i), ty(i) - 28).pd().c(8).text(i, 8, 11);
}

// 格子槽：外框 60x30 + 左侧下标 + 值（行距 36，槽高 34 不碰上下邻格）
void paintCell(int i) {
    double y = 241 - i * 36;
    pen.setAngle(0);
    pen.pu().moveTo(-300, y).pd().c(cCol[i]).size(2).r(60, 30);
    pen.pu().moveTo(-348, y).pd().c(0).text(i, 0, 13);
    if (tree[i] == INT_MAX) pen.pu().moveTo(-300, y).pd().c(8).text("空", 8, 14);
    else pen.pu().moveTo(-300, y).pd().c(0).text(tree[i], 0, 15);
}

void paintEdge(int c) {                  // c 是孩子，父节点是 (c-1)/2
    int p = (c - 1) / 2;
    pen.c(0);
    seg(tx(p), ty(p), tx(c), ty(c), eW[c]);
}

// 静态背景只画一次，且都在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 288).pd().c(0).textL("二叉树的数组表示", 0, 26);
    pen.pu().moveTo(-60, -150).pd().c(2).textL("映射：左孩子 2i+1 / 右孩子 2i+2（下标从 0 起）", 2, 17);
    pen.pu().moveTo(-350, -355).pd().c(8).textL("省掉指针的代价：空位也要占格子，只适合完全二叉树", 8, 15);
}

void draw() {
    erN = 0;
    int l = (cur >= 0) ? 2 * cur + 1 : -1;
    int r = (cur >= 0) ? 2 * cur + 2 : -1;
    for (int i = 0; i < N; i++) {
        nCol[i] = cellCol(i, l, r);
        cCol[i] = nCol[i];
        dn[i] = (nCol[i] != lCol[i]) ? 1 : 0;
        dc[i] = (cCol[i] != lcCol[i]) ? 1 : 0;
        pn[i] = dn[i]; pc[i] = dc[i];
        de[i] = 0; pe[i] = 0;
    }
    for (int c = 1; c < N; c++) {
        eW[c] = ((c - 1) / 2 == cur) ? 4 : 2;
        if (eW[c] < leW[c]) de[c] = 1;              // 变细了原位盖不住，先擦走廊
        pe[c] = (de[c] || eW[c] != leW[c]) ? 1 : 0;
    }

    // 动态文字槽：当前这一步的映射说明
    std::string s = "按数组顺序逐个检查下标 i";
    if (cur >= 0) {
        if (tree[cur] == INT_MAX) s = "[" + std::to_string(cur) + "] 是空位（INT_MAX），跳过";
        else {
            s = "[" + std::to_string(cur) + "] = " + std::to_string(tree[cur]) + "：";
            if (l < N && tree[l] != INT_MAX) s += "左 [" + std::to_string(l) + "] = " + std::to_string(tree[l]) + "  ";
            if (r < N && tree[r] != INT_MAX) s += "右 [" + std::to_string(r) + "] = " + std::to_string(tree[r]);
        }
    }
    if (s != lS) {
        eraseBox(-160, -320, 400, 28);
        pen.pu().moveTo(-350, -320).pd().c(1).textL(s, 1, 18);
        lS = s;
    }

    // 擦：脏树圈槽 + 脏格子槽 + 要擦的边走廊
    for (int i = 0; i < N; i++) {
        if (dn[i]) eraseBox(tx(i), ty(i) - 6, 48, 64);
        if (dc[i]) eraseBox(-312, 241 - i * 36, 90, 34);
    }
    for (int c = 1; c < N; c++)
        if (de[c]) eraseSeg(tx((c - 1) / 2), ty((c - 1) / 2), tx(c), ty(c));

    // 补画：被擦到的边、被擦到的圈 / 格子，以及补画边会盖到的端点
    for (int c = 1; c < N; c++) {
        if (pe[c]) continue;
        int p = (c - 1) / 2;
        if (segHitEr(tx(p), ty(p), tx(c), ty(c), 3)) pe[c] = 1;
    }
    for (int i = 0; i < N; i++) {
        if (!pn[i] && rectHitEr(tx(i), ty(i) - 6, 48, 64)) pn[i] = 1;
        if (!pc[i] && rectHitEr(-312, 241 - i * 36, 90, 34)) pc[i] = 1;
    }
    for (int c = 1; c < N; c++) if (pe[c]) { pn[c] = 1; pn[(c - 1) / 2] = 1; }

    for (int c = 1; c < N; c++) if (pe[c]) paintEdge(c);
    for (int i = 0; i < N; i++) if (pn[i]) paintNode(i);
    for (int i = 0; i < N; i++) if (pc[i]) paintCell(i);

    for (int i = 0; i < N; i++) { lCol[i] = nCol[i]; lcCol[i] = cCol[i]; }
    for (int c = 1; c < N; c++) leW[c] = eW[c];
}

int main() {
    pen.speed(10);
    drawStatic();
    for (int i = 0; i < N; i++) done[i] = 0;
    draw();
    wait(0.5);
    for (int i = 0; i < N; i++) {
        cur = i;
        draw();
        wait(tree[i] == INT_MAX ? 0.12 : 0.3);
        done[i] = 1;
    }
    cur = -1;
    draw();
    wait(0.6);
    printf("数组表示点亮完毕：15 个格子里 5 个空位（INT_MAX），非空节点都满足左 2i+1 / 右 2i+2。\\n");
    return 0;
}
`,
  },
  'AVL 树：节点、高度与平衡因子（画图版）': {
    group: 'GoC 可视化·树与堆',
    stdin: '',
    code: `// AVL 树：每个节点标出高度 h 和平衡因子 bf = 左子树高 - 右子树高。
// 用原版同一组值 1、2、3、4 演示两种失衡：
//   LL：按 4,3,2,1 插入，一路偏左，bf = +2，右旋修复；
//   RR：按 1,2,3,4 插入，一路偏右，bf = -2，左旋修复。
// 颜色：蓝 = 正常，黄 = 刚插入 / 旋转中心，红 = 失衡（|bf| > 1）。旋转前后各停一帧。
#include <goc.h>
#include <cstdio>
#include <string>

const int MAXN = 8;
struct Node { int val, height, l, r; };
Node nd[MAXN];
int nc = 0, root = -1;
double X[MAXN], Y[MAXN];
int ord[MAXN], dep[MAXN], oc, cnt;
std::string msg;
int hl = -1;                 // 刚插入的节点
int hr = -1;                 // 旋转中心

void layout();
void draw();

int height(int p) { return p >= 0 ? nd[p].height : 0; }
int balanceFactor(int p) { return p >= 0 ? height(nd[p].l) - height(nd[p].r) : 0; }
void updateHeight(int p) {
    int l = height(nd[p].l), r = height(nd[p].r);
    nd[p].height = (l > r ? l : r) + 1;
}
void updateAll(int p) {
    if (p < 0) return;
    updateAll(nd[p].l);
    updateAll(nd[p].r);
    updateHeight(p);
}

// 右旋：左孩子顶上来，原根的左子树换成左孩子的右子树
int rotateRight(int p) {
    int q = nd[p].l;
    nd[p].l = nd[q].r;
    nd[q].r = p;
    updateHeight(p);
    updateHeight(q);
    return q;
}
// 左旋：右孩子顶上来，镜像操作
int rotateLeft(int p) {
    int q = nd[p].r;
    nd[p].r = nd[q].l;
    nd[q].l = p;
    updateHeight(p);
    updateHeight(q);
    return q;
}

int insertNode(int p, int v) {
    if (p < 0) {
        nd[nc].val = v; nd[nc].height = 1; nd[nc].l = nd[nc].r = -1;
        return nc++;
    }
    if (v < nd[p].val) nd[p].l = insertNode(nd[p].l, v);
    else nd[p].r = insertNode(nd[p].r, v);
    updateHeight(p);
    return p;
}

// 插完后自底向上找第一个失衡节点并旋转；旋转前后各画一帧
void rebalance() {
    int path[MAXN], len = 0, p = root;
    while (p >= 0) {                       // 先记下从根到新节点的查找路径
        path[len++] = p;
        p = (nd[hl].val < nd[p].val) ? nd[p].l : nd[p].r;
    }
    for (int k = len - 1; k >= 0; k--) {   // 自底向上检查
        int u = path[k];
        int bf = balanceFactor(u);
        if (bf > 1) {
            hr = u;
            msg = "节点 " + std::to_string(nd[u].val) + " 的 bf = +2：LL 失衡，右旋（旋转前）";
            layout(); draw(); wait(0.6);
            int np = rotateRight(u);
            if (u == root) root = np;
            else {
                int fa = path[k - 1];
                if (nd[fa].l == u) nd[fa].l = np; else nd[fa].r = np;
            }
            updateAll(root);
            msg = "右旋完成：左孩子顶上去，恢复平衡（旋转后）";
            layout(); draw(); wait(0.6);
            hr = -1;
            return;
        }
        if (bf < -1) {
            hr = u;
            msg = "节点 " + std::to_string(nd[u].val) + " 的 bf = -2：RR 失衡，左旋（旋转前）";
            layout(); draw(); wait(0.6);
            int np = rotateLeft(u);
            if (u == root) root = np;
            else {
                int fa = path[k - 1];
                if (nd[fa].l == u) nd[fa].l = np; else nd[fa].r = np;
            }
            updateAll(root);
            msg = "左旋完成：右孩子顶上去，恢复平衡（旋转后）";
            layout(); draw(); wait(0.6);
            hr = -1;
            return;
        }
    }
}

void mark(int p, int d) {
    if (p < 0) return;
    dep[p] = d;
    mark(nd[p].l, d + 1);
    ord[p] = oc++;
    mark(nd[p].r, d + 1);
}
void layout() {
    oc = 0;
    mark(root, 0);
    cnt = oc;
    for (int i = 0; i < nc; i++) {
        X[i] = (ord[i] - (cnt - 1) / 2.0) * 100.0;
        Y[i] = 240 - dep[i] * 105.0;
    }
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 900;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                       // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

int nOn[MAXN], nCol[MAXN], nBf[MAXN];            // 这一帧想要的节点状态
int lOn[MAXN], lCol[MAXN], lV[MAXN], lH[MAXN], lBf[MAXN];
double lX[MAXN], lY[MAXN];                       // 上一帧的位置（旋转后要擦旧槽）
int eOn[MAXN], eC[MAXN], ePar[MAXN];             // 入边按孩子下标索引，线宽恒为 2
int leOn[MAXN], leC[MAXN];
double leX1[MAXN], leY1[MAXN], leX2[MAXN], leY2[MAXN];
int dn[MAXN], pn[MAXN], de[MAXN], pe[MAXN];
std::string lMsg;

// 节点槽：圆圈 r20 + 值 + 右侧 h/bf 标签（标签伸到 X+108，槽就得开到 X+112）
void paintNode(int i) {
    int col = nCol[i];
    int bf = nBf[i];
    int tc = (col == 2) ? 15 : 0;
    pen.setAngle(0);
    pen.pu().moveTo(X[i], Y[i]).pd().c(col).size(2).oo(20);
    pen.pu().moveTo(X[i], Y[i]).pd().c(tc).text(nd[i].val, tc, 17);
    std::string lab = "h" + std::to_string(nd[i].height) + " bf" + (bf > 0 ? "+" : "") + std::to_string(bf);
    int lc = (bf > 1 || bf < -1) ? 1 : 8;
    pen.pu().moveTo(X[i] + 58, Y[i]).pd().c(lc).textL(lab, lc, 13);
}

void paintEdge(int c) {                  // c 是孩子，边从 ePar[c] 连到 c
    pen.c(eC[c]);
    seg(X[ePar[c]], Y[ePar[c]], X[c], Y[c], 2);
}

// 静态背景只画一次，且都在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("AVL 树：节点、高度与平衡因子", 0, 26);
    pen.pu().moveTo(-350, -320).pd().c(8).textL("bf = 左子树高 - 右子树高，|bf| > 1 就失衡，需要旋转", 8, 16);
}

void draw() {
    erN = 0;
    int ec = msg.empty() ? 0 : 1;        // 沿用原版：seg 继承上一支笔的颜色
    for (int i = 0; i < MAXN; i++) {
        nOn[i] = 0; eOn[i] = 0; ePar[i] = -1;
        dn[i] = 0; pn[i] = 0; de[i] = 0; pe[i] = 0;
    }
    for (int i = 0; i < nc; i++) {
        nOn[i] = 1;
        int bf = balanceFactor(i);
        nBf[i] = bf;
        int col = 2;                                   // 蓝：平衡
        if (bf > 1 || bf < -1) col = 1;                // 红：失衡
        if (i == hl || i == hr) col = 5;               // 黄：新节点 / 旋转中心
        nCol[i] = col;
        if (nd[i].l >= 0) { eOn[nd[i].l] = 1; ePar[nd[i].l] = i; eC[nd[i].l] = ec; }
        if (nd[i].r >= 0) { eOn[nd[i].r] = 1; ePar[nd[i].r] = i; eC[nd[i].r] = ec; }
    }
    for (int i = 0; i < MAXN; i++) {
        if (!nOn[i]) { dn[i] = lOn[i]; continue; }      // 整棵树清空：擦掉所有旧槽
        dn[i] = (!lOn[i] || nCol[i] != lCol[i] || nd[i].val != lV[i]
                 || nd[i].height != lH[i] || nBf[i] != lBf[i]
                 || fabs(X[i] - lX[i]) > 0.01 || fabs(Y[i] - lY[i]) > 0.01) ? 1 : 0;
        pn[i] = dn[i];
    }
    for (int c = 0; c < MAXN; c++) {
        if (!eOn[c]) { de[c] = leOn[c]; continue; }     // 边被删：擦旧走廊
        if (!leOn[c]) { pe[c] = 1; continue; }          // 新边：直接画
        double x1 = X[ePar[c]], y1 = Y[ePar[c]], x2 = X[c], y2 = Y[c];
        int moved = (fabs(x1 - leX1[c]) > 0.01 || fabs(y1 - leY1[c]) > 0.01
                     || fabs(x2 - leX2[c]) > 0.01 || fabs(y2 - leY2[c]) > 0.01) ? 1 : 0;
        if (moved) { de[c] = 1; pe[c] = 1; }            // 旋转挪位：擦旧走廊再画
        else pe[c] = (eC[c] != leC[c]) ? 1 : 0;         // 只变色：原位重画盖旧
    }

    // 动态文字槽：提示语
    if (msg != lMsg) {
        eraseBox(-140, 295, 440, 24);
        if (!msg.empty()) pen.pu().moveTo(-350, 295).pd().c(1).textL(msg, 1, 19);
        lMsg = msg;
    }

    // 擦：脏节点的旧槽 + 要擦的边走廊
    for (int i = 0; i < MAXN; i++) if (dn[i] && lOn[i]) eraseBox(lX[i] + 42, lY[i], 140, 52);
    for (int c = 0; c < MAXN; c++) if (de[c]) eraseSeg(leX1[c], leY1[c], leX2[c], leY2[c]);

    // 补画：被擦到的边、被擦到的节点，以及补画边会盖到的端点节点
    for (int c = 0; c < MAXN; c++) {
        if (!eOn[c] || pe[c]) continue;
        if (segHitEr(X[ePar[c]], Y[ePar[c]], X[c], Y[c], 3)) pe[c] = 1;
    }
    for (int i = 0; i < MAXN; i++)
        if (nOn[i] && !pn[i] && rectHitEr(X[i] + 42, Y[i], 140, 52)) pn[i] = 1;
    for (int c = 0; c < MAXN; c++) if (pe[c] && eOn[c]) { pn[c] = 1; pn[ePar[c]] = 1; }

    for (int c = 0; c < MAXN; c++) if (pe[c] && eOn[c]) paintEdge(c);
    for (int i = 0; i < MAXN; i++) if (pn[i] && nOn[i]) paintNode(i);

    for (int i = 0; i < MAXN; i++) {
        lOn[i] = nOn[i];
        if (nOn[i]) {
            lCol[i] = nCol[i]; lV[i] = nd[i].val; lH[i] = nd[i].height; lBf[i] = nBf[i];
            lX[i] = X[i]; lY[i] = Y[i];
        }
    }
    for (int c = 0; c < MAXN; c++) {
        leOn[c] = eOn[c];
        if (eOn[c]) {
            leC[c] = eC[c];
            leX1[c] = X[ePar[c]]; leY1[c] = Y[ePar[c]]; leX2[c] = X[c]; leY2[c] = Y[c];
        }
    }
}

int main() {
    pen.speed(10);
    drawStatic();
    // LL 演示：按 4,3,2,1 插入（就是原版那棵一路向左的链）
    msg = "LL 演示：按 4, 3, 2, 1 的顺序插入";
    draw();
    wait(0.5);
    int seq1[4] = {4, 3, 2, 1};
    for (int i = 0; i < 4; i++) {
        root = insertNode(root, seq1[i]);
        hl = nc - 1;
        updateAll(root);
        layout();
        msg = "插入 " + std::to_string(seq1[i]);
        draw();
        wait(0.3);
        rebalance();
    }
    hl = -1;
    msg = "LL 完成：所有节点 |bf| <= 1";
    layout(); draw();
    wait(0.5);

    // RR 演示：同一组值，按 1,2,3,4 插入，一路偏右
    nc = 0; root = -1; hl = -1; hr = -1;
    msg = "RR 演示：同一组值按 1, 2, 3, 4 插入";
    draw();
    wait(0.5);
    int seq2[4] = {1, 2, 3, 4};
    for (int i = 0; i < 4; i++) {
        root = insertNode(root, seq2[i]);
        hl = nc - 1;
        updateAll(root);
        layout();
        msg = "插入 " + std::to_string(seq2[i]);
        draw();
        wait(0.3);
        rebalance();
    }
    hl = -1;
    msg = "RR 完成：左旋一次就恢复平衡";
    layout(); draw();
    wait(0.5);
    printf("AVL 演示完成：LL 右旋一次、RR 左旋一次，两棵树所有节点 |bf| <= 1。\\n");
    return 0;
}
`,
  },
  '哈夫曼树与编码（数组建树）（画图版）': {
    group: 'GoC 可视化·树与堆',
    stdin: '',
    code: `// 哈夫曼树（数组建树）：节点全放定长数组，下标当指针。
// 动画：6 个叶子各自成树（森林），每次挑两个 parent==0 的最小权值合并，
// 新节点长在孩子上方，森林逐步长成一根树；最后从叶子往根倒推编码，画出编码表。
// 颜色：蓝 = 叶子，黄 = 本轮选中的两个最小权，绿 = 合并出的新节点 / 编码路径，灰 = 已用过的节点。
#include <goc.h>
#include <cstdio>
#include <string>

struct Node { int w, parent, lch, rch; };
Node h[12];
const int n = 6;
const char ch[6] = {'A', 'B', 'C', 'D', 'E', 'F'};
const int freq[6] = {45, 13, 12, 16, 9, 5};
int mm1[5], mm2[5];            // 记录每轮合并选中的两个下标
int shown[12];                 // 哪些节点已经画出来
double X[12], Y[12];
int dep[12];
std::string msg;
int hlA = -1, hlB = -1;        // 本轮选中的两个最小权
int fresh = -1;                // 刚合并出的新节点
int pathNode = -1;             // 正在推编码的叶子
int pathMark[12];              // 编码路径上的节点
std::string codes[6];

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

int leafSlot = 0;
void place(int p, int d) {     // 先序定深度，叶子按从左到右占槽，内部节点取孩子中点
    dep[p] = d;
    if (h[p].lch < 0) {
        X[p] = -300 + leafSlot * 120;
        leafSlot++;
    } else {
        place(h[p].lch, d + 1);
        place(h[p].rch, d + 1);
        X[p] = (X[h[p].lch] + X[h[p].rch]) / 2;
    }
    Y[p] = 200 - d * 95;
}

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 900;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                       // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

int nOn[12], nCol[12];                   // 这一帧想要的节点状态
int lOn[12], lCol[12];                   // 上一帧画出来的节点状态
int eOn[12], eW[12], eC[12], ePar[12];   // 入边按孩子下标索引
int leOn[12], leW[12], leC[12], lePar[12];
double leX1[12], leY1[12], leX2[12], leY2[12], leLX[12], leLY[12];
int dn[12], pn[12], de[12], pe[12];
std::string lMsg;
int codeDrawn[6];                        // 编码表只增不改，推出来就画一次

// 节点槽：圆圈 r20 + 字母/权值 + 叶子下方的权值（伸到 Y-38.5）
void paintNode(int k) {
    int col = nCol[k];
    int tc = (col == 2) ? 15 : 0;
    pen.setAngle(0);
    pen.pu().moveTo(X[k], Y[k]).pd().c(col).size(2).oo(20);
    if (k < n) {
        char s[2] = {ch[k], 0};
        pen.pu().moveTo(X[k], Y[k]).pd().c(tc).text(s, tc, 16);
        pen.pu().moveTo(X[k], Y[k] - 32).pd().c(0).text(h[k].w, 0, 13);
    } else {
        pen.pu().moveTo(X[k], Y[k]).pd().c(tc).text(h[k].w, tc, 15);
    }
}

// 边槽 = 连线 + 中点旁的 0/1 标签，擦和画都要带上标签
void paintEdge(int c) {
    int p = ePar[c];
    pen.c(eC[c]);
    seg(X[p], Y[p], X[c], Y[c], eW[c]);
    int isL = (h[p].lch == c);
    pen.pu().moveTo((X[p] + X[c]) / 2 + (isL ? -10 : 10), (Y[p] + Y[c]) / 2)
       .pd().c(2).text(isL ? "0" : "1", 2, 13);
}

void eraseEdgeSlot(int c) {
    eraseSeg(leX1[c], leY1[c], leX2[c], leY2[c]);
    eraseBox(leLX[c], leLY[c], 20, 20);
}

// 静态背景只画一次，且都在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 288).pd().c(0).textL("哈夫曼树与编码（数组建树）", 0, 26);
    pen.pu().moveTo(-350, -240).pd().c(0).textL("编码表（左 0 右 1，叶子往根倒推再翻转）：", 0, 16);
}

void draw() {
    erN = 0;
    for (int k = 0; k < 12; k++) {
        nOn[k] = 0; eOn[k] = 0; ePar[k] = -1;
        dn[k] = 0; pn[k] = 0; de[k] = 0; pe[k] = 0;
    }
    // 边 + 0/1 标签：左 0 右 1。颜色沿用原版：第一条边继承提示语的笔色，之后继承标签的蓝色
    int ec0 = msg.empty() ? 0 : 1;
    int seen = 0;
    for (int k = 0; k < 12; k++) {
        if (!shown[k] || h[k].lch < 0) continue;
        int l = h[k].lch, r = h[k].rch;
        int hot = (pathMark[k] && (pathMark[l] || pathMark[r]));
        int ec = seen ? 2 : ec0;
        seen = 1;
        eOn[l] = 1; ePar[l] = k; eW[l] = hot ? 4 : 2; eC[l] = ec;
        eOn[r] = 1; ePar[r] = k; eW[r] = hot ? 4 : 2; eC[r] = ec;
    }
    for (int k = 0; k < 12; k++) {
        if (!shown[k]) { dn[k] = lOn[k]; continue; }
        nOn[k] = 1;
        int col = (k < n) ? 2 : 3;
        if (k < n && h[k].parent != 0) col = 8;        // 已合并过的叶子变灰
        if (pathMark[k]) col = 3;                      // 编码路径标绿
        if (k == hlA || k == hlB) col = 5;             // 选中的两个最小权标黄
        if (k == fresh) col = 3;
        nCol[k] = col;
        dn[k] = (!lOn[k] || nCol[k] != lCol[k]) ? 1 : 0;
        pn[k] = dn[k];
    }
    for (int c = 0; c < 12; c++) {
        if (!eOn[c]) { de[c] = leOn[c]; continue; }     // 边被删：擦旧走廊
        if (!leOn[c]) { pe[c] = 1; continue; }          // 新边：直接画
        if (eW[c] < leW[c]) { de[c] = 1; pe[c] = 1; }   // 变细了原位盖不住
        else pe[c] = (eW[c] != leW[c] || eC[c] != leC[c]) ? 1 : 0;
    }

    // 动态文字槽：提示语
    if (msg != lMsg) {
        eraseBox(-100, 248, 520, 24);
        if (!msg.empty()) pen.pu().moveTo(-350, 248).pd().c(1).textL(msg, 1, 19);
        lMsg = msg;
    }
    // 编码表：两列三行，推出来的画一次就不再动（只增不减，无需擦槽）
    for (int i = 0; i < n; i++) {
        if (codes[i].empty() || codeDrawn[i]) continue;
        double x = (i < 3) ? -250 : 90;
        double y = -275 - (i % 3) * 34;
        std::string s = std::string(1, ch[i]) + "(" + std::to_string(freq[i]) + ") : " + codes[i];
        pen.pu().moveTo(x, y).pd().c(3).textL(s, 3, 17);
        codeDrawn[i] = 1;
    }

    // 擦：脏节点槽 + 要擦的边槽（连线走廊 + 0/1 标签）
    for (int k = 0; k < 12; k++) if (dn[k] && lOn[k]) eraseBox(X[k], Y[k] - 8, 56, 76);
    for (int c = 0; c < 12; c++) if (de[c]) eraseEdgeSlot(c);

    // 补画：被擦到的边（连标签一起算）、被擦到的节点，以及补画边会盖到的端点
    for (int c = 0; c < 12; c++) {
        if (!eOn[c] || pe[c]) continue;
        int p = ePar[c];
        if (segHitEr(X[p], Y[p], X[c], Y[c], 16)) pe[c] = 1;
    }
    for (int k = 0; k < 12; k++)
        if (nOn[k] && !pn[k] && rectHitEr(X[k], Y[k] - 8, 56, 76)) pn[k] = 1;
    for (int c = 0; c < 12; c++) if (pe[c] && eOn[c]) { pn[c] = 1; pn[ePar[c]] = 1; }

    for (int c = 0; c < 12; c++) if (pe[c] && eOn[c]) paintEdge(c);
    for (int k = 0; k < 12; k++) if (pn[k] && nOn[k]) paintNode(k);

    for (int k = 0; k < 12; k++) { lOn[k] = nOn[k]; if (nOn[k]) lCol[k] = nCol[k]; }
    for (int c = 0; c < 12; c++) {
        leOn[c] = eOn[c];
        if (eOn[c]) {
            int p = ePar[c];
            leW[c] = eW[c]; leC[c] = eC[c]; lePar[c] = p;
            leX1[c] = X[p]; leY1[c] = Y[p]; leX2[c] = X[c]; leY2[c] = Y[c];
            leLX[c] = (X[p] + X[c]) / 2 + ((h[p].lch == c) ? -10 : 10);
            leLY[c] = (Y[p] + Y[c]) / 2;
        }
    }
}

int main() {
    pen.speed(10);
    drawStatic();
    for (int i = 0; i < 12; i++) { h[i].w = 0; h[i].parent = 0; h[i].lch = h[i].rch = -1; }
    for (int i = 0; i < n; i++) h[i].w = freq[i];

    // 与原版一致的建树循环：每轮挑两个 parent==0 的最小权节点合并
    for (int k = n; k < 2 * n - 1; k++) {
        int m1 = -1, m2 = -1;
        for (int i = 0; i < k; i++) {
            if (h[i].parent != 0) continue;
            if (m1 < 0 || h[i].w < h[m1].w) { m2 = m1; m1 = i; }
            else if (m2 < 0 || h[i].w < h[m2].w) m2 = i;
        }
        h[k].w = h[m1].w + h[m2].w;
        h[k].lch = m1; h[k].rch = m2;
        h[m1].parent = h[m2].parent = k;
        mm1[k - n] = m1; mm2[k - n] = m2;
    }
    int root = 2 * n - 2;
    place(root, 0);
    for (int i = 0; i < 12; i++) { shown[i] = 0; pathMark[i] = 0; }
    for (int i = 0; i < n; i++) shown[i] = 1;

    msg = "森林：6 个叶子各是一棵树，权值 = 字符频率";
    draw();
    wait(0.6);

    // 回放合并过程：先标黄两个最小权，再长出新节点
    for (int k = n; k < 2 * n - 1; k++) {
        hlA = mm1[k - n]; hlB = mm2[k - n];
        msg = "第 " + std::to_string(k - n + 1) + " 轮：取最小 " + std::to_string(h[hlA].w) + " 和 " + std::to_string(h[hlB].w);
        draw();
        wait(0.35);
        shown[k] = 1;
        fresh = k; hlA = hlB = -1;
        msg = "合并 " + std::to_string(h[mm1[k - n]].w) + " + " + std::to_string(h[mm2[k - n]].w) + " = " + std::to_string(h[k].w) + "（新节点下标 " + std::to_string(k) + "）";
        draw();
        wait(0.35);
        fresh = -1;
    }
    msg = "森林长成一棵树：根权值 " + std::to_string(h[root].w);
    draw();
    wait(0.5);

    // 编码：与原版一致，从叶子往根记 0/1，再翻转；路径同步点亮
    long long wpl = 0;
    for (int i = 0; i < n; i++) {
        char code[16]; int len = 0;
        for (int p = i; h[p].parent != 0; p = h[p].parent) {
            int par = h[p].parent;
            code[len++] = (h[par].lch == p) ? '0' : '1';
        }
        code[len] = 0;
        for (int l = 0; l < len / 2; l++) {
            char t = code[l]; code[l] = code[len - 1 - l]; code[len - 1 - l] = t;
        }
        codes[i] = code;
        wpl += (long long)freq[i] * len;
        for (int k = 0; k < 12; k++) pathMark[k] = 0;
        for (int p = i; p != root; p = h[p].parent) pathMark[p] = 1;
        pathMark[root] = 1;
        pathNode = i;
        msg = std::string(1, ch[i]) + " 的编码：从叶子往根走，左 0 右 1，倒过来就是 " + codes[i];
        draw();
        wait(0.3);
    }
    for (int k = 0; k < 12; k++) pathMark[k] = 0;
    pathNode = -1;
    msg = "编码完成：频率越高的字符编码越短";
    draw();
    wait(0.6);
    printf("哈夫曼树建好：根权值 %d，WPL = %lld（A:0 B:101 C:100 D:111 E:1101 F:1100）\\n", h[root].w, wpl);
    return 0;
}
`,
  },
  '优先队列（大顶堆 / 小顶堆）（画图版）': {
    group: 'GoC 可视化·树与堆',
    stdin: '',
    code: `// 优先队列 = 数组 + 上下沉规则。上面画树形、下面画数组柱状图，双视图同步。
// 先玩大顶堆：push 1,3,2,5,4 看上浮，再逐个 pop 看出堆顺序；
// 最后换小顶堆，buildHeap 直接建堆看下沉。
// 颜色：蓝 = 普通，黄 = 正在比较 / 交换的两个位置，绿 = 堆顶，红 = 正要弹出的堆顶。
#include <goc.h>
#include <cstdio>
#include <string>

const int CAP = 32;
int heap[CAP];
int hn = 0;
bool isMin = false;                    // false = 大顶堆
std::string msg, popped;
int hi = -1, hj = -1;                  // 正在比较 / 交换的两个下标
int topGreen = 0;                      // 1 = 堆顶标绿
int topRed = -1;                       // 正要弹出的堆顶标红

bool better(int a, int b) { return isMin ? a < b : a > b; }

double hx(int i) {                     // 树形视图坐标
    int lv = 0;
    while ((1 << (lv + 1)) - 1 <= i) lv++;
    int first = (1 << lv) - 1, cnt = 1 << lv;
    return (i - first - (cnt - 1) / 2.0) * (420.0 / cnt);
}
double hy(int i) {
    int lv = 0;
    while ((1 << (lv + 1)) - 1 <= i) lv++;
    return 240 - lv * 95;
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 900;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                       // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

const double BASE = -250;                // 柱状图基准线

int nOn[CAP], nCol[CAP];                 // 树形视图
int lOn[CAP], lCol[CAP], lV[CAP];
int bOn[CAP], bCol[CAP];                 // 柱状图视图
int lbOn[CAP], lbCol[CAP], lbV[CAP];
double lbH[CAP];                         // 上一帧的柱高（擦槽得按旧高度擦）
int eOn[CAP], eC[CAP], leOn[CAP], leC[CAP];
int dn[CAP], pn[CAP], db[CAP], pb[CAP], de[CAP], pe[CAP], bfix[CAP];
std::string lMsg, lPopped;
int lMode = -1, lBaseCol = -1;

int nodeCol(int i) {
    int col = 2;
    if (i == hi || i == hj) col = 5;
    else if (i == 0 && topGreen) col = 3;
    if (i == topRed) col = 1;
    return col;
}

double barLo(double hgt) { (void)hgt; return BASE - 27; }   // 柱底对齐基准线，槽下界只到下标标签
double barHi(double hgt) { return BASE + hgt + 24; }

// 树圈槽：圆圈 r19 + 值（最密一层横距 105，槽宽 48 不碰邻居）
void paintNode(int i) {
    int col = nCol[i];
    int tc = (col == 2) ? 15 : 0;
    pen.setAngle(0);
    pen.pu().moveTo(hx(i), hy(i)).pd().c(col).size(2).oo(19);
    pen.pu().moveTo(hx(i), hy(i)).pd().c(tc).text(heap[i], tc, 16);
}

// 柱槽：柱底对齐基准线（rr 以笔尖为中心，故笔尖放在 BASE+hgt/2）；上面值、下面下标
void paintBar(int i) {
    double x = -152 + i * 76;
    double hgt = heap[i] * 28.0;
    pen.setAngle(0);
    pen.pu().moveTo(x, BASE + hgt / 2).pd().c(bCol[i]).size(2).rr(56, hgt);
    pen.pu().moveTo(x, BASE + hgt + 14).pd().c(0).text(heap[i], 0, 15);
    pen.pu().moveTo(x, BASE - 18).pd().c(8).text(i, 8, 12);
}

void paintEdge(int i) {                  // i 是孩子，父节点是 (i-1)/2
    int p = (i - 1) / 2;
    pen.c(eC[i]);
    seg(hx(p), hy(p), hx(i), hy(i), 2);
}

// 基准线只画一次；柱槽擦到它时就地补一小段（同路径同线宽同色，接头看不出来）
void paintBase(int col) { pen.c(col); seg(-220, BASE, 220, BASE, 3); }
void paintBasePiece(int i, int col) {
    double x = -152 + i * 76;
    pen.c(col);
    seg(x - 32, BASE, x + 32, BASE, 3);
}

// 静态背景只画一次，且都在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 288).pd().c(0).textL("优先队列（大顶堆 / 小顶堆）", 0, 26);
    pen.pu().moveTo(-330, BASE).pd().c(0).textL("堆数组", 0, 16);
}

void draw() {
    erN = 0;
    int ec = msg.empty() ? 2 : 1;        // 沿用原版：seg 继承上一支笔的颜色
    for (int i = 0; i < CAP; i++) {
        nOn[i] = 0; bOn[i] = 0; eOn[i] = 0;
        dn[i] = 0; pn[i] = 0; db[i] = 0; pb[i] = 0; de[i] = 0; pe[i] = 0; bfix[i] = 0;
    }
    for (int i = 0; i < hn; i++) {
        nOn[i] = 1; bOn[i] = 1;
        nCol[i] = nodeCol(i); bCol[i] = nCol[i];
        if (i > 0) { eOn[i] = 1; eC[i] = ec; }
    }
    for (int i = 0; i < CAP; i++) {
        if (!nOn[i]) { dn[i] = lOn[i]; db[i] = lbOn[i]; continue; }   // 出堆：擦掉旧槽
        dn[i] = (!lOn[i] || nCol[i] != lCol[i] || heap[i] != lV[i]) ? 1 : 0;
        db[i] = (!lbOn[i] || bCol[i] != lbCol[i] || heap[i] != lbV[i]) ? 1 : 0;
        pn[i] = dn[i]; pb[i] = db[i];
    }
    for (int i = 1; i < CAP; i++) {
        if (!eOn[i]) { de[i] = leOn[i]; continue; }
        if (!leOn[i]) { pe[i] = 1; continue; }
        pe[i] = (eC[i] != leC[i]) ? 1 : 0;      // 几何不变，只变色：原位重画盖旧
    }
    // 基准线的颜色原版是继承最后一个树圈文字的笔色，照搬
    int baseCol = (hn == 0) ? (msg.empty() ? 2 : 1) : ((nodeCol(hn - 1) == 2) ? 15 : 0);
    int baseDirty = (baseCol != lBaseCol) ? 1 : 0;

    // 动态文字槽：堆模式 / 提示语 / 出堆顺序
    int mode = isMin ? 1 : 0;
    if (mode != lMode) {
        eraseBox(235, 288, 90, 30);
        pen.pu().moveTo(200, 288).pd().c(2).textL(isMin ? "小顶堆" : "大顶堆", 2, 20);
        lMode = mode;
    }
    if (msg != lMsg) {
        eraseBox(-100, -300, 600, 24);
        if (!msg.empty()) pen.pu().moveTo(-350, -300).pd().c(1).textL(msg, 1, 18);
        lMsg = msg;
    }
    int ppop = 0;
    if (popped != lPopped) {
        eraseBox(-255, -330, 200, 28);
        ppop = 1; lPopped = popped;
    }

    // 擦：脏树圈槽 + 脏柱槽（按上一帧柱高）+ 要擦的边走廊
    for (int i = 0; i < CAP; i++) {
        if (dn[i]) eraseBox(hx(i), hy(i), 48, 48);
        if (db[i]) {
            double lo = barLo(lbH[i]), hi = barHi(lbH[i]);
            eraseBox(-152 + i * 76, (lo + hi) / 2, 64, hi - lo);
            bfix[i] = 1;                       // 柱槽压到基准线，擦完得补一段
        }
    }
    for (int i = 1; i < CAP; i++)
        if (de[i]) eraseSeg(hx((i - 1) / 2), hy((i - 1) / 2), hx(i), hy(i));

    // 补画：被擦到的边、树圈、柱子，以及补画边会盖到的端点
    for (int i = 1; i < CAP; i++) {
        if (!eOn[i] || pe[i]) continue;
        int p = (i - 1) / 2;
        if (segHitEr(hx(p), hy(p), hx(i), hy(i), 3)) pe[i] = 1;
    }
    for (int i = 0; i < CAP; i++) {
        if (nOn[i] && !pn[i] && rectHitEr(hx(i), hy(i), 48, 48)) pn[i] = 1;
        if (bOn[i] && !pb[i]) {
            double hgt = heap[i] * 28.0;
            double lo = barLo(hgt), hi = barHi(hgt);
            if (rectHitEr(-152 + i * 76, (lo + hi) / 2, 64, hi - lo)) pb[i] = 1;
        }
    }
    for (int i = 1; i < CAP; i++) if (pe[i] && eOn[i]) { pn[i] = 1; pn[(i - 1) / 2] = 1; }
    if (baseDirty) for (int i = 0; i < CAP; i++) if (bOn[i]) pb[i] = 1;   // 重画基准线会盖到柱子
    if (!ppop && !popped.empty() && rectHitEr(-255, -330, 200, 28)) ppop = 1;

    // 画：基准线 -> 边 -> 树圈 -> 柱子 -> 出堆顺序
    if (baseDirty) paintBase(baseCol);
    else for (int i = 0; i < CAP; i++) if (bfix[i]) paintBasePiece(i, baseCol);
    for (int i = 1; i < CAP; i++) if (pe[i] && eOn[i]) paintEdge(i);
    for (int i = 0; i < CAP; i++) if (pn[i] && nOn[i]) paintNode(i);
    for (int i = 0; i < CAP; i++) if (pb[i] && bOn[i]) paintBar(i);
    if (ppop && !popped.empty())
        pen.pu().moveTo(-350, -330).pd().c(3).textL("出堆顺序：" + popped, 3, 18);

    for (int i = 0; i < CAP; i++) {
        lOn[i] = nOn[i]; lbOn[i] = bOn[i]; leOn[i] = eOn[i];
        if (nOn[i]) { lCol[i] = nCol[i]; lV[i] = heap[i]; }
        if (bOn[i]) { lbCol[i] = bCol[i]; lbV[i] = heap[i]; lbH[i] = heap[i] * 28.0; }
        if (eOn[i]) leC[i] = eC[i];
    }
    lBaseCol = baseCol;
}

// 下沉：和两个孩子里更好的那个换位，一路换到底（每步都画出来）
void siftDown(int i) {
    while (true) {
        int l = 2 * i + 1, r = 2 * i + 2, s = i;
        if (l < hn && better(heap[l], heap[s])) s = l;
        if (r < hn && better(heap[r], heap[s])) s = r;
        if (s == i) break;
        hi = i; hj = s;
        draw();
        wait(0.16);
        int t = heap[i]; heap[i] = heap[s]; heap[s] = t;
        draw();
        wait(0.16);
        i = s;
    }
    hi = hj = -1;
}

// 入堆：先塞到末尾，再一路上浮
void push(int x) {
    int i = hn++;
    heap[i] = x;
    hi = i; hj = -1;
    msg = "push " + std::to_string(x) + "：先放到末尾，再上浮";
    draw();
    wait(0.18);
    while (i > 0) {
        int p = (i - 1) / 2;
        hi = i; hj = p;
        draw();
        wait(0.16);
        if (!better(heap[i], heap[p])) break;
        int t = heap[p]; heap[p] = heap[i]; heap[i] = t;
        draw();
        wait(0.16);
        i = p;
    }
    hi = hj = -1;
}

// 出堆：堆顶换到末尾，末尾那个再下沉回坑里
void pop() {
    if (hn == 0) return;
    topRed = 0;
    msg = "pop：弹出堆顶 " + std::to_string(heap[0]);
    draw();
    wait(0.2);
    popped += std::to_string(heap[0]) + " ";
    heap[0] = heap[--hn];
    topRed = -1;
    msg = "末尾元素补到堆顶，再下沉";
    draw();
    wait(0.18);
    siftDown(0);
}

int top() { return heap[0]; }
bool empty() { return hn == 0; }
int size() { return hn; }

// 输入列表并建堆：从最后一个非叶子节点开始逐个下沉
void buildHeap(const int a[], int m) {
    hn = m;
    for (int i = 0; i < m; i++) heap[i] = a[i];
    msg = "buildHeap：列表直接入数组，从最后一个非叶子开始下沉";
    draw();
    wait(0.35);
    for (int i = m / 2 - 1; i >= 0; i--) siftDown(i);
}

int main() {
    pen.speed(10);
    drawStatic();
    isMin = false;
    msg = "大顶堆：依次 push 1, 3, 2, 5, 4（插入后上浮）";
    draw();
    wait(0.35);
    int vals[5] = {1, 3, 2, 5, 4};
    for (int i = 0; i < 5; i++) push(vals[i]);
    topGreen = 1;
    msg = "堆顶 = " + std::to_string(top()) + "，堆里 " + std::to_string(size()) + " 个，不空";
    draw();
    wait(0.45);
    topGreen = 0;
    while (!empty()) pop();
    msg = "大顶堆出堆完毕：从大到小";
    draw();
    wait(0.4);

    isMin = true;
    hn = 0;
    popped = "";
    int input[5] = {1, 3, 2, 5, 4};
    buildHeap(input, 5);
    topGreen = 1;
    msg = "小顶堆建好：堆顶 = " + std::to_string(top()) + "（最小的）";
    draw();
    wait(0.5);
    printf("大顶堆出堆顺序 5 4 3 2 1；小顶堆 buildHeap 后堆顶 = %d。\\n", top());
    return 0;
}
`,
  },
  '图：邻接表 + DFS/BFS（画图版）': {
    group: 'GoC 可视化·图与哈希',
    stdin: '',
    code: `// 图：邻接表 + DFS/BFS 的可视化版。算法与数据同原版：6 个点、7 条无向边，
// 邻接表 adj[u] 存邻居，先递归 DFS 再队列 BFS。
// 左边画节点圆圈和边，右边画邻接表，下面画访问顺序与栈/队列。
// 颜色：黄 = 正在递归栈上 / 在队列里（正在处理），绿 = 已访问，
//       红 = 当前正在扫描的边，灰 = 还没用到的边。
#include <goc.h>
#include <cstdio>
#include <queue>

const int N = 6;
const int MAXD = 8;
int adj[N][MAXD];
int deg[N];
bool vis[N];
int adjE[N][MAXD];              // 每个邻居条目来自哪条无向边（只为画图）

int edges[7][2] = {{0,1},{0,2},{1,3},{2,3},{3,4},{4,5},{2,5}};
double px[N] = {-290,-110,-290,-110,-200,-350};
double py[N] = {210,210,70,70,-60,-60};

// ---- 动画状态 ----
int builtE = 0;                 // 已经建好的边数
int phase = 0;                  // 0 建表 1 DFS 2 BFS
int onPath[N], inQ[N];
int order[N], ordN = 0;
int stk[N], stkN = 0;           // DFS 递归栈（显示用）
int bq[N], bqN = 0;             // BFS 队列（显示用）
int treeE[7];
int scanE = -1, curU = -1, curV = -1;
int dfsOrd[N], dfsN = 0;

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
// ---- 局部重绘基础设施：擦除矩形登记 + 命中补画 ----
const int NB = 8;
const int MAXR = 3000;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;
void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN]=cx; erY[erN]=cy; erW[erN]=w; erH[erN]=h; erN++; }
}
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2-x1, dy = y2-y1, L = sqrt(dx*dx+dy*dy);
    int steps = (int)(L/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        eraseBox(x1+dx*t, y1+dy*t, 12, 12);
    }
}
int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx-erX[k])*2 <= w+erW[k] && fabs(cy-erY[k])*2 <= h+erH[k]) return 1;
    return 0;
}
int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2-x1, dy = y2-y1;
    int steps = (int)(sqrt(dx*dx+dy*dy)/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        double x = x1+dx*t, y = y1+dy*t;
        for (int j = 0; j < erN; j++)
            if (fabs(x-erX[j]) <= erW[j]/2+m && fabs(y-erY[j]) <= erH[j]/2+m) return 1;
    }
    return 0;
}

void txt(double x, double y, const char* s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void cell(double x, double y, double w, double h, int fill) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().size(2).rr(w, h, fill).r(w, h, 0);
}
int edgeId(int u, int v) {
    for (int i = 0; i < 7; i++)
        if ((edges[i][0]==u && edges[i][1]==v) || (edges[i][0]==v && edges[i][1]==u)) return i;
    return -1;
}

// ---- 当前帧要画的状态 / 上一帧已画的状态 ----
int cECol[7]; double cEW[7];
int cFill[N], cRing[N];
int cRowHi[N], cRowN[N], cRowV[N][MAXD], cRowC[N][MAXD];
int cOrdV[NB], cStkV[NB];
int lBuilt[7], lECol[7]; double lEW[7];
int lFill[N], lRing[N];
int lRowHi[N], lRowN[N], lRowV[N][MAXD], lRowC[N][MAXD];
int lOrdV[NB], lStkV[NB];
int lPhase = -1, lStkLab = -1;

void initLast() {
    for (int i = 0; i < 7; i++) { lBuilt[i]=0; lECol[i]=-1; lEW[i]=0; }
    for (int i = 0; i < N; i++) {
        lFill[i]=-1; lRing[i]=-1; lRowHi[i]=-1; lRowN[i]=-1;
        for (int k = 0; k < MAXD; k++) { lRowV[i][k]=-1; lRowC[i][k]=-1; }
    }
    for (int i = 0; i < NB; i++) { lOrdV[i]=-1; lStkV[i]=-1; }
    lPhase=-1; lStkLab=-1;
}

// 静态背景：只画一次，全部落在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("图：邻接表 + DFS/BFS", 0, 26);
    pen.c(8); seg(10, 290, 10, -100, 1);
    txtL(40, 265, "邻接表 adj[u]", 8, 18);
    txtL(-350, -165, "访问顺序:", 8, 16);
    txtL(-350, -300, "黄=在栈/队列  绿=已访问  红=正在扫描的边", 8, 15);
}

void paintEdge(int i) {
    int u = edges[i][0], v = edges[i][1];
    pen.c(cECol[i]); seg(px[u], py[u], px[v], py[v], cEW[i]);
}
void paintNode(int i) {
    char lab[4]; snprintf(lab, sizeof lab, "%d", i);
    pen.setAngle(0);
    pen.pu().moveTo(px[i], py[i]).pd().size(2).oo(22, cFill[i]).o(22, cRing[i]);
    txt(px[i], py[i], lab, 0, 18);
}
void paintRow(int u) {
    double y = 210 - u * 42;
    if (cRowHi[u]) {
        pen.setAngle(0);
        pen.pu().moveTo(190, y).pd().c(5).rr(330, 34, 5);
    }
    char lab[8]; snprintf(lab, sizeof lab, "%d:", u);
    txtL(45, y, lab, 0, 18);
    for (int k = 0; k < cRowN[u]; k++) {
        double x = 120 + k * 52;
        cell(x, y, 40, 30, cRowC[u][k]);
        char nb[4]; snprintf(nb, sizeof nb, "%d", cRowV[u][k]);
        txt(x, y, nb, 0, 16);
    }
}
void paintOrd(int i) {
    if (cOrdV[i] < 0) return;
    double x = -235 + i * 50;
    cell(x, -165, 40, 32, 3);
    char nb[4]; snprintf(nb, sizeof nb, "%d", cOrdV[i]);
    txt(x, -165, nb, 0, 16);
}
void paintStk(int i) {
    if (cStkV[i] < 0) return;
    double x = -235 + i * 50;
    cell(x, -230, 40, 32, 5);
    char nb[4]; snprintf(nb, sizeof nb, "%d", cStkV[i]);
    txt(x, -230, nb, 0, 16);
}

// 每帧：算脏 -> 全部擦除（登记）-> 命中补画标记 -> 边 -> 节点 -> 表 -> 底部
void draw() {
    erN = 0;
    for (int i = 0; i < 7; i++) {
        cECol[i] = 8; cEW[i] = 2;
        if (treeE[i]) { cECol[i] = 3; cEW[i] = 4; }
        if (i == scanE) { cECol[i] = 1; cEW[i] = 4; }
    }
    for (int i = 0; i < N; i++) {
        cFill[i] = 15;
        if (vis[i]) cFill[i] = 3;
        if (onPath[i] || inQ[i]) cFill[i] = 5;
        cRing[i] = (i == curU) ? 1 : 0;
    }
    for (int u = 0; u < N; u++) {
        cRowHi[u] = (u == curU) ? 1 : 0;
        cRowN[u] = 0;
        for (int k = 0; k < deg[u]; k++) {
            if (adjE[u][k] >= builtE) continue;
            cRowV[u][cRowN[u]] = adj[u][k];
            cRowC[u][cRowN[u]] = (u==curU && adj[u][k]==curV) ? 1 : 15;
            cRowN[u]++;
        }
    }
    int sn = phase==2 ? bqN : stkN;
    for (int i = 0; i < NB; i++) {
        cOrdV[i] = i < ordN ? order[i] : -1;
        cStkV[i] = i < sn ? (phase==2 ? bq[i] : stk[i]) : -1;
    }

    int de[7], pe[7], dn[N], pn[N], dr[N], pr[N];
    int dov[NB], pov[NB], dsv[NB], psv[NB];
    for (int i = 0; i < 7; i++) {
        de[i] = 0; pe[i] = 0;
        if (i >= builtE) { if (lBuilt[i]) de[i] = 1; }
        else if (!lBuilt[i]) pe[i] = 1;
        else {
            if (cEW[i] < lEW[i]) de[i] = 1;
            if (cECol[i] != lECol[i] || cEW[i] != lEW[i]) pe[i] = 1;
        }
    }
    for (int i = 0; i < N; i++) {
        dn[i] = (cFill[i]!=lFill[i] || cRing[i]!=lRing[i]) ? 1 : 0;
        pn[i] = dn[i];
        dr[i] = (cRowHi[i]!=lRowHi[i] || cRowN[i]!=lRowN[i]) ? 1 : 0;
        for (int k = 0; k < cRowN[i]; k++)
            if (cRowV[i][k]!=lRowV[i][k] || cRowC[i][k]!=lRowC[i][k]) dr[i] = 1;
        pr[i] = dr[i];
    }
    for (int i = 0; i < NB; i++) {
        dov[i] = (cOrdV[i]!=lOrdV[i]) ? 1 : 0; pov[i] = dov[i];
        dsv[i] = (cStkV[i]!=lStkV[i]) ? 1 : 0; psv[i] = dsv[i];
    }
    int sl = phase==2 ? 1 : 0;
    int dph = (phase!=lPhase) ? 1 : 0, pph = dph;
    int dsl = (sl!=lStkLab) ? 1 : 0, psl = dsl;

    // ---- 擦除（只擦不画）----
    for (int i = 0; i < 7; i++) if (de[i]) {
        int u = edges[i][0], v = edges[i][1];
        eraseSeg(px[u], py[u], px[v], py[v]);
    }
    for (int i = 0; i < N; i++) if (dn[i]) eraseBox(px[i], py[i], 52, 52);
    for (int u = 0; u < N; u++) if (dr[u]) eraseBox(190, 210-u*42, 340, 38);
    for (int i = 0; i < NB; i++) {
        if (dov[i]) eraseBox(-235+i*50, -165, 46, 38);
        if (dsv[i]) eraseBox(-235+i*50, -230, 46, 38);
    }
    if (dph) eraseBox(-280, -120, 160, 28);
    if (dsl) eraseBox(-315, -230, 76, 26);

    // ---- 命中补画：擦节点槽会切断穿过它的边，这里补回来 ----
    for (int i = 0; i < 7; i++) if (i < builtE) {
        int u = edges[i][0], v = edges[i][1];
        if (segHitEr(px[u], py[u], px[v], py[v], 3)) pe[i] = 1;
    }
    for (int i = 0; i < 7; i++) if (pe[i] && i < builtE) {
        pn[edges[i][0]] = 1; pn[edges[i][1]] = 1;
    }
    for (int i = 0; i < N; i++) if (rectHitEr(px[i], py[i], 52, 52)) pn[i] = 1;
    for (int u = 0; u < N; u++) if (rectHitEr(190, 210-u*42, 340, 38)) pr[u] = 1;
    for (int i = 0; i < NB; i++) {
        if (rectHitEr(-235+i*50, -165, 46, 38)) pov[i] = 1;
        if (rectHitEr(-235+i*50, -230, 46, 38)) psv[i] = 1;
    }
    if (rectHitEr(-280, -120, 160, 28)) pph = 1;
    if (rectHitEr(-315, -230, 76, 26)) psl = 1;

    // ---- 绘制（只画不擦）：边 -> 节点 -> 邻接表 -> 底部 ----
    for (int i = 0; i < 7; i++) if (pe[i] && i < builtE) paintEdge(i);
    for (int i = 0; i < N; i++) if (pn[i]) paintNode(i);
    for (int u = 0; u < N; u++) if (pr[u]) paintRow(u);
    for (int i = 0; i < NB; i++) { if (pov[i]) paintOrd(i); if (psv[i]) paintStk(i); }
    if (pph) {
        const char* ph = phase==1 ? "DFS（递归）" : (phase==2 ? "BFS（队列）" : "建邻接表");
        txtL(-350, -120, ph, 2, 20);
    }
    if (psl) txtL(-350, -230, phase==2 ? "队列:" : "递归栈:", 8, 16);

    // ---- 保存已画状态 ----
    for (int i = 0; i < 7; i++) { lBuilt[i] = i < builtE ? 1 : 0; lECol[i] = cECol[i]; lEW[i] = cEW[i]; }
    for (int i = 0; i < N; i++) {
        lFill[i] = cFill[i]; lRing[i] = cRing[i];
        lRowHi[i] = cRowHi[i]; lRowN[i] = cRowN[i];
        for (int k = 0; k < MAXD; k++) { lRowV[i][k] = cRowV[i][k]; lRowC[i][k] = cRowC[i][k]; }
    }
    for (int i = 0; i < NB; i++) { lOrdV[i] = cOrdV[i]; lStkV[i] = cStkV[i]; }
    lPhase = phase; lStkLab = sl;
}

// 递归 DFS：入栈标黄，扫描邻边标红，走到的树边标绿（同原版 dfs）
void dfs(int u) {
    vis[u] = true; onPath[u] = 1; stk[stkN++] = u; order[ordN++] = u;
    curU = u; curV = -1; scanE = -1;
    draw(); wait(0.06);
    for (int k = 0; k < deg[u]; k++) {
        int v = adj[u][k];
        curV = v; scanE = edgeId(u, v);
        draw(); wait(0.04);
        if (!vis[v]) { treeE[scanE] = 1; dfs(v); curU = u; }
        scanE = -1; curV = -1;
    }
    onPath[u] = 0; stkN--;
    draw(); wait(0.03);
}

// 队列 BFS：入队即标记，逐层扩散（同原版 BFS）
void bfs() {
    std::queue<int> q;
    q.push(0); vis[0] = true; inQ[0] = 1; bq[bqN++] = 0;
    draw(); wait(0.06);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        inQ[u] = 0;
        for (int i = 0; i < bqN - 1; i++) bq[i] = bq[i+1];
        bqN--;
        order[ordN++] = u; curU = u;
        draw(); wait(0.06);
        for (int k = 0; k < deg[u]; k++) {
            int v = adj[u][k];
            curV = v; scanE = edgeId(u, v);
            draw(); wait(0.03);
            if (!vis[v]) {
                vis[v] = true; inQ[v] = 1; q.push(v);
                treeE[scanE] = 1; bq[bqN++] = v;
                draw(); wait(0.03);
            }
            scanE = -1; curV = -1;
        }
        curU = -1;
    }
}

int main() {
    pen.speed(10);
    initLast();
    drawStatic();
    for (int i = 0; i < 7; i++) {
        int a = edges[i][0], b = edges[i][1];
        adj[a][deg[a]] = b; adjE[a][deg[a]] = i; deg[a]++;
        adj[b][deg[b]] = a; adjE[b][deg[b]] = i; deg[b]++;
        builtE = i + 1;
        draw(); wait(0.05);
    }
    wait(0.3);
    phase = 1;
    dfs(0);
    for (int i = 0; i < ordN; i++) dfsOrd[i] = order[i];
    dfsN = ordN;
    for (int i = 0; i < N; i++) { vis[i] = false; onPath[i] = 0; inQ[i] = 0; }
    for (int i = 0; i < 7; i++) treeE[i] = 0;
    ordN = 0; stkN = 0; curU = -1; curV = -1; scanE = -1;
    phase = 2;
    draw(); wait(0.4);
    bfs();
    draw(); wait(0.8);
    printf("DFS:");
    for (int i = 0; i < dfsN; i++) printf(" %d", dfsOrd[i]);
    printf("; BFS:");
    for (int i = 0; i < ordN; i++) printf(" %d", order[i]);
    printf("\\n");
    return 0;
}
`,
  },
  '图：Dijkstra 最短路（画图版）': {
    group: 'GoC 可视化·图与哈希',
    stdin: '',
    code: `// 图：Dijkstra 最短路的可视化版。算法与数据同原版：5 个点、7 条带权有向边，
// 数组版小顶堆（按 (距离,顶点) 字典序），懒删除跳过旧记录。
// 左边画带权图，右边画 dist 数组 d[] 与前驱 pre[]，下面画堆内容。
// 颜色：黄 = 正在处理的节点/堆顶记录，绿 = 已确定最短距离，
//       红 = 当前正在松弛的边；结束后最短路径树的边标绿。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 5;
const int MAXD = 8;
const int INF = 1000000000;
int adjv[N][MAXD], adjw[N][MAXD], deg[N];
int d[N], pre[N];

struct Item { int d, u; };
Item heap[N * MAXD];
int hn = 0;
bool lessItem(const Item& a, const Item& b) { return a.d != b.d ? a.d < b.d : a.u < b.u; }
void hpush(int dist, int u) {
    int i = hn++;
    heap[i].d = dist; heap[i].u = u;
    while (i > 0) {
        int p = (i - 1) / 2;
        if (!lessItem(heap[i], heap[p])) break;
        Item t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p;
    }
}
Item hpop() {
    Item top = heap[0]; heap[0] = heap[--hn];
    int i = 0;
    while (true) {
        int l = 2*i+1, r = 2*i+2, s = i;
        if (l < hn && lessItem(heap[l], heap[s])) s = l;
        if (r < hn && lessItem(heap[r], heap[s])) s = r;
        if (s == i) break;
        Item t = heap[i]; heap[i] = heap[s]; heap[s] = t; i = s;
    }
    return top;
}

int e[7][3] = {{0,1,4},{0,2,1},{2,1,2},{1,3,1},{2,3,5},{3,4,3},{0,3,100}};
double px[N] = {-270,-90,-270,-90,-180};
double py[N] = {200,250,60,100,-80};

int settled[N], flash[N];
int curU = -1, curV = -1, curEdge = -1;
int treeE[7];
int eid[N][N];
char msg[160];

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    double ux = dx / L, uy = dy / L, a = 12.0, c = 0.8660254, s = 0.5;
    seg(x2, y2, x2 + (-ux*c + uy*s)*a, y2 + (-ux*s - uy*c)*a, w);
    seg(x2, y2, x2 + (-ux*c - uy*s)*a, y2 + (ux*s - uy*c)*a, w);
}
// ---- 局部重绘基础设施：擦除矩形登记 + 命中补画 ----
const int HB = 6;
const int MAXR = 3000;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;
void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN]=cx; erY[erN]=cy; erW[erN]=w; erH[erN]=h; erN++; }
}
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2-x1, dy = y2-y1, L = sqrt(dx*dx+dy*dy);
    int steps = (int)(L/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        eraseBox(x1+dx*t, y1+dy*t, 12, 12);
    }
}
int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx-erX[k])*2 <= w+erW[k] && fabs(cy-erY[k])*2 <= h+erH[k]) return 1;
    return 0;
}
int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2-x1, dy = y2-y1;
    int steps = (int)(sqrt(dx*dx+dy*dy)/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        double x = x1+dx*t, y = y1+dy*t;
        for (int j = 0; j < erN; j++)
            if (fabs(x-erX[j]) <= erW[j]/2+m && fabs(y-erY[j]) <= erH[j]/2+m) return 1;
    }
    return 0;
}

void txt(double x, double y, const char* s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void cell(double x, double y, double w, double h, int fill) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().size(2).rr(w, h, fill).r(w, h, 0);
}

// 边的几何固定不变，预先算好：箭杆两端 + 权值标签位置
double ex1[7], ey1[7], ex2[7], ey2[7], eux[7], euy[7], elx[7], ely[7];
void geom() {
    for (int i = 0; i < 7; i++) {
        int u = e[i][0], v = e[i][1];
        double dx = px[v]-px[u], dy = py[v]-py[u], L = sqrt(dx*dx+dy*dy);
        double ux = dx/L, uy = dy/L;
        eux[i] = ux; euy[i] = uy;
        ex1[i] = px[u]+ux*24; ey1[i] = py[u]+uy*24;
        ex2[i] = px[v]-ux*26; ey2[i] = py[v]-uy*26;
        elx[i] = (px[u]+px[v])/2 - uy*16;
        ely[i] = (py[u]+py[v])/2 + ux*16;
    }
}

// ---- 当前帧 / 上一帧 ----
int cECol[7]; double cEW[7];
int cFill[N], cRowFill[N], cD[N], cPre[N];
int cHD[HB], cHU[HB], cHF[HB];
int lECol[7]; double lEW[7];
int lFill[N], lRowFill[N], lD[N], lPre[N];
int lHD[HB], lHU[HB], lHF[HB];
char lmsg[160];

void initLast() {
    for (int i = 0; i < 7; i++) { lECol[i]=-1; lEW[i]=0; }
    for (int i = 0; i < N; i++) { lFill[i]=-1; lRowFill[i]=-1; lD[i]=-1; lPre[i]=-2; }
    for (int i = 0; i < HB; i++) { lHD[i]=-1; lHU[i]=-1; lHF[i]=-1; }
    lmsg[0] = 0;
}

// 静态背景：只画一次，全部落在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("图：Dijkstra 最短路", 0, 26);
    pen.c(8); seg(20, 290, 20, -120, 1);
    txtL(60, 265, "v   d[v]   pre[v]", 8, 18);
    txtL(-350, -160, "小顶堆 (d,u):", 8, 16);
    txtL(-350, -330, "黄=正在处理  绿=已确定  红=正在松弛的边", 8, 15);
}

void paintEdge(int i) { arrow(ex1[i], ey1[i], ex2[i], ey2[i], cEW[i], cECol[i]); }
void paintLabel(int i) {
    char wb[8]; snprintf(wb, sizeof wb, "%d", e[i][2]);
    txt(elx[i], ely[i], wb, cECol[i]==8?0:cECol[i], 15);
}
void paintNode(int i) {
    char lab[4]; snprintf(lab, sizeof lab, "%d", i);
    pen.setAngle(0);
    pen.pu().moveTo(px[i], py[i]).pd().size(2).oo(22, cFill[i]).o(22, 0);
    txt(px[i], py[i], lab, 0, 18);
}
void paintRow(int v) {
    double y = 215 - v * 46;
    char lab[4]; snprintf(lab, sizeof lab, "%d", v);
    txtL(60, y, lab, 0, 18);
    cell(150, y, 90, 34, cRowFill[v]);
    char db[16];
    if (cD[v] >= INF) snprintf(db, sizeof db, "INF"); else snprintf(db, sizeof db, "%d", cD[v]);
    txt(150, y, db, 0, 17);
    cell(265, y, 80, 34, cRowFill[v]);
    char pb[8]; snprintf(pb, sizeof pb, "%d", cPre[v]);
    txt(265, y, pb, 0, 17);
}
void paintHeap(int i) {
    if (cHF[i] < 0) return;
    double x = -300 + i * 86;
    cell(x, -205, 78, 36, cHF[i]);
    char hb[24]; snprintf(hb, sizeof hb, "(%d,%d)", cHD[i], cHU[i]);
    txt(x, -205, hb, 0, 15);
}

void draw() {
    erN = 0;
    for (int i = 0; i < 7; i++) {
        cECol[i] = 8; cEW[i] = 2;
        if (treeE[i]) { cECol[i] = 3; cEW[i] = 4; }
        if (i == curEdge) { cECol[i] = 1; cEW[i] = 4; }
    }
    for (int i = 0; i < N; i++) {
        cFill[i] = 15;
        if (settled[i]) cFill[i] = 3;
        if (i == curU) cFill[i] = 5;
        cRowFill[i] = 15;
        if (settled[i]) cRowFill[i] = 3;
        if (flash[i]) cRowFill[i] = 5;
        cD[i] = d[i]; cPre[i] = pre[i];
    }
    for (int i = 0; i < HB; i++) {
        cHD[i] = i < hn ? heap[i].d : -1;
        cHU[i] = i < hn ? heap[i].u : -1;
        cHF[i] = i < hn ? (i==0 ? 5 : 15) : -1;
    }

    int de[7], pe[7], pl[7], dn[N], pn[N], dr[N], pr[N], dh[HB], ph[HB];
    for (int i = 0; i < 7; i++) {
        de[i] = (cEW[i] < lEW[i]) ? 1 : 0;
        pe[i] = (cECol[i]!=lECol[i] || cEW[i]!=lEW[i]) ? 1 : 0;
        pl[i] = pe[i];
    }
    for (int i = 0; i < N; i++) {
        dn[i] = (cFill[i]!=lFill[i]) ? 1 : 0; pn[i] = dn[i];
        dr[i] = (cRowFill[i]!=lRowFill[i] || cD[i]!=lD[i] || cPre[i]!=lPre[i]) ? 1 : 0;
        pr[i] = dr[i];
    }
    for (int i = 0; i < HB; i++) {
        dh[i] = (cHD[i]!=lHD[i] || cHU[i]!=lHU[i] || cHF[i]!=lHF[i]) ? 1 : 0;
        ph[i] = dh[i];
    }
    int dmsg = strcmp(msg, lmsg) != 0 ? 1 : 0, pmsg = dmsg;

    // ---- 擦除（只擦不画）----
    for (int i = 0; i < 7; i++) if (de[i]) {
        eraseSeg(ex1[i], ey1[i], ex2[i], ey2[i]);
        eraseBox(ex2[i]-eux[i]*6, ey2[i]-euy[i]*6, 30, 30);
    }
    for (int i = 0; i < 7; i++) if (pe[i]) eraseBox(elx[i], ely[i], 30, 22);
    for (int i = 0; i < N; i++) if (dn[i]) eraseBox(px[i], py[i], 52, 52);
    for (int v = 0; v < N; v++) if (dr[v]) eraseBox(182, 215-v*46, 260, 38);
    for (int i = 0; i < HB; i++) if (dh[i]) eraseBox(-300+i*86, -205, 82, 40);
    if (dmsg) eraseBox(-90, -270, 520, 26);

    // ---- 命中补画 ----
    for (int i = 0; i < 7; i++)
        if (segHitEr(ex1[i], ey1[i], ex2[i], ey2[i], 6)) pe[i] = 1;
    int anyE = 0;
    for (int i = 0; i < 7; i++) if (pe[i]) anyE = 1;
    if (anyE) {
        for (int i = 0; i < 7; i++) {
            pl[i] = 1;
            pn[e[i][0]] = 1; pn[e[i][1]] = 1;
        }
    }
    for (int i = 0; i < N; i++) if (rectHitEr(px[i], py[i], 52, 52)) pn[i] = 1;
    for (int v = 0; v < N; v++) if (rectHitEr(182, 215-v*46, 260, 38)) pr[v] = 1;
    for (int i = 0; i < HB; i++) if (rectHitEr(-300+i*86, -205, 82, 40)) ph[i] = 1;
    if (rectHitEr(-90, -270, 520, 26)) pmsg = 1;

    // ---- 绘制（只画不擦）：边线 -> 权值 -> 节点 -> 表 -> 堆 -> 消息 ----
    for (int i = 0; i < 7; i++) if (pe[i]) paintEdge(i);
    for (int i = 0; i < 7; i++) if (pl[i]) paintLabel(i);
    for (int i = 0; i < N; i++) if (pn[i]) paintNode(i);
    for (int v = 0; v < N; v++) if (pr[v]) paintRow(v);
    for (int i = 0; i < HB; i++) if (ph[i]) paintHeap(i);
    if (pmsg) txtL(-350, -270, msg, 2, 17);

    for (int i = 0; i < 7; i++) { lECol[i] = cECol[i]; lEW[i] = cEW[i]; }
    for (int i = 0; i < N; i++) {
        lFill[i] = cFill[i]; lRowFill[i] = cRowFill[i]; lD[i] = cD[i]; lPre[i] = cPre[i];
    }
    for (int i = 0; i < HB; i++) { lHD[i] = cHD[i]; lHU[i] = cHU[i]; lHF[i] = cHF[i]; }
    snprintf(lmsg, sizeof lmsg, "%s", msg);
}

int main() {
    pen.speed(10);
    geom();
    initLast();
    drawStatic();
    for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) eid[i][j] = -1;
    for (int i = 0; i < 7; i++) {
        int u = e[i][0], v = e[i][1], w = e[i][2];
        adjv[u][deg[u]] = v; adjw[u][deg[u]] = w; deg[u]++;
        eid[u][v] = i;
    }
    for (int i = 0; i < N; i++) { d[i] = INF; pre[i] = -1; }
    d[0] = 0;
    snprintf(msg, sizeof msg, "init: d[0]=0, rest INF, push (0,0)");
    draw(); wait(0.7);
    hpush(0, 0);
    draw(); wait(0.05);
    while (hn > 0) {
        draw(); wait(0.05);                 // 高亮堆顶（最小记录）
        Item it = hpop();
        int du = it.d, u = it.u;
        if (du > d[u]) {                    // 旧记录，跳过（同原版）
            snprintf(msg, sizeof msg, "pop (%d,%d): stale, skip", du, u);
            draw(); wait(0.05);
            continue;
        }
        settled[u] = 1;
        snprintf(msg, sizeof msg, "pop (%d,%d): settle %d, d=%d", du, u, u, du);
        draw(); wait(0.06);
        for (int k = 0; k < deg[u]; k++) {
            int v = adjv[u][k], w = adjw[u][k];
            curU = u; curV = v; curEdge = eid[u][v];
            snprintf(msg, sizeof msg, "relax %d->%d: %d+%d=%d", u, v, du, w, du+w);
            draw(); wait(0.05);
            if (d[v] > du + w) {
                d[v] = du + w; pre[v] = u; flash[v] = 1;
                treeE[curEdge] = 1;
                hpush(d[v], v);
                snprintf(msg, sizeof msg, "relax %d->%d: d[%d]=%d, push", u, v, v, d[v]);
                draw(); wait(0.05);
                flash[v] = 0;
            }
            curU = -1; curV = -1; curEdge = -1;
        }
    }
    for (int i = 0; i < 7; i++) treeE[i] = 0;
    for (int v = 0; v < N; v++) if (pre[v] >= 0) treeE[eid[pre[v]][v]] = 1;
    snprintf(msg, sizeof msg, "done: green edges = shortest path tree");
    draw(); wait(1.2);
    printf("d=[%d,%d,%d,%d,%d]; 0->3 walk 0->2->1->3 (direct 100 edge unused)\\n",
           d[0], d[1], d[2], d[3], d[4]);
    return 0;
}
`,
  },
  '并查集：连通块个数（画图版）': {
    group: 'GoC 可视化·图与哈希',
    stdin: '',
    code: `// 并查集：连通块个数的可视化版。算法与数据同原版：8 个点、7 次 unite，
// find 用路径减半（fa[x]=fa[fa[x]]），unite 按大小合并。
// 上面一排节点按所属连通块染色，中间画 parent 森林（箭头指向父亲），
// 下面显示连通块计数和 fa/sz 数组。
// 颜色：黄 = 正在找根的节点，绿 = 刚合并好的边，红 = 正在被路径减半改挂的父亲指针。
#include <goc.h>
#include <cstdio>
#include <cstring>
#include <algorithm>

const int MAXN = 64;
const int NN = 8;

struct DSU {
    int fa[MAXN], sz[MAXN];
    DSU(int n) { for (int i = 0; i < n; i++) { fa[i] = i; sz[i] = 1; } }
    int find(int x);
    bool unite(int a, int b);
};

DSU* gp = 0;
int hlNode = -1;                // 正在路径减半的节点
int hlA = -1, hlB = -1;         // 当前 unite 的一对
int mergeA = -1, mergeB = -1;   // 刚合并的两个根（绿闪）
int faFlash = -1, szFlash = -1;
int blocks = NN;
char msg[160];
int rootCol[8] = {3,2,14,11,4,13,9,12};

double nx(int i) { return -329.0 + i * 94.0; }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    double ux = dx / L, uy = dy / L, a = 11.0, c = 0.8660254, s = 0.5;
    seg(x2, y2, x2 + (-ux*c + uy*s)*a, y2 + (-ux*s - uy*c)*a, w);
    seg(x2, y2, x2 + (-ux*c - uy*s)*a, y2 + (ux*s - uy*c)*a, w);
}
// ---- 局部重绘基础设施：擦除矩形登记 + 命中补画 ----
const int MAXR = 3000;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;
void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN]=cx; erY[erN]=cy; erW[erN]=w; erH[erN]=h; erN++; }
}
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2-x1, dy = y2-y1, L = sqrt(dx*dx+dy*dy);
    int steps = (int)(L/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        eraseBox(x1+dx*t, y1+dy*t, 12, 12);
    }
}
int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx-erX[k])*2 <= w+erW[k] && fabs(cy-erY[k])*2 <= h+erH[k]) return 1;
    return 0;
}
int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2-x1, dy = y2-y1;
    int steps = (int)(sqrt(dx*dx+dy*dy)/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        double x = x1+dx*t, y = y1+dy*t;
        for (int j = 0; j < erN; j++)
            if (fabs(x-erX[j]) <= erW[j]/2+m && fabs(y-erY[j]) <= erH[j]/2+m) return 1;
    }
    return 0;
}

void txt(double x, double y, const char* s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void cell(double x, double y, double w, double h, int fill) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().size(2).rr(w, h, fill).r(w, h, 0);
}
int rootOf(int x) { while (gp->fa[x] != x) x = gp->fa[x]; return x; }
int depthOf(int x) { int d = 0; while (gp->fa[x] != x) { x = gp->fa[x]; d++; } return d; }

// ---- 当前帧 / 上一帧 ----
int cTopFill[NN], cTopRing[NN];
int cFy[NN], cFFill[NN], cFa[NN], cACol[NN], cAOn[NN];
int cFaV[NN], cFaF[NN], cSzV[NN], cSzF[NN], cBlocks;
int lTopFill[NN], lTopRing[NN];
int lFy[NN], lFFill[NN], lFa[NN], lACol[NN], lAOn[NN];
int lFaV[NN], lFaF[NN], lSzV[NN], lSzF[NN], lBlocks = -1;
char lmsg[160];

void initLast() {
    for (int i = 0; i < NN; i++) {
        lTopFill[i]=-1; lTopRing[i]=-1;
        lFy[i]=150; lFFill[i]=-1; lFa[i]=i; lACol[i]=-1; lAOn[i]=0;
        lFaV[i]=-1; lFaF[i]=-1; lSzV[i]=-1; lSzF[i]=-1;
    }
    lBlocks=-1; lmsg[0]=0;
}

// 静态背景：只画一次，全部落在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("并查集：连通块个数", 0, 26);
    txtL(-350, 205, "节点颜色 = 所属连通块", 8, 15);
    txtL(-350, -160, "连通块", 8, 18);
    txtL(-60, -160, "fa:", 8, 16);
    txtL(-60, -215, "sz:", 8, 16);
    txtL(-350, -330, "黄=正在找根  绿=刚合并  红=父亲指针被改挂", 8, 15);
}

void arrowGeom(int i, int p, double yi, double yp, double* g) {
    double cx = nx(i), cy = yi, pxx = nx(p), pyy = yp;
    double dx = pxx-cx, dy = pyy-cy, L = sqrt(dx*dx+dy*dy);
    if (L < 1e-6) { g[0]=cx; g[1]=cy; g[2]=cx; g[3]=cy; return; }
    double ux = dx/L, uy = dy/L;
    g[0]=cx+ux*20; g[1]=cy+uy*20; g[2]=pxx-ux*22; g[3]=pyy-uy*22;
}
void paintTop(int i) {
    char lab[4]; snprintf(lab, sizeof lab, "%d", i);
    pen.setAngle(0);
    pen.pu().moveTo(nx(i), 245).pd().size(2).oo(24, cTopFill[i]).o(24, cTopRing[i]);
    txt(nx(i), 245, lab, 0, 18);
}
void paintForest(int i) {
    char lab[4]; snprintf(lab, sizeof lab, "%d", i);
    pen.setAngle(0);
    pen.pu().moveTo(nx(i), cFy[i]).pd().size(2).oo(20, cFFill[i]).o(20, 0);
    txt(nx(i), cFy[i], lab, 0, 16);
}
void paintFEdge(int i) {
    double g[4];
    arrowGeom(i, cFa[i], cFy[i], cFy[cFa[i]], g);
    arrow(g[0], g[1], g[2], g[3], 2, cACol[i]);
}
void paintFa(int i) {
    double x = -10 + i * 46;
    cell(x, -160, 40, 30, cFaF[i]);
    char vb[4]; snprintf(vb, sizeof vb, "%d", cFaV[i]);
    txt(x, -160, vb, 0, 15);
}
void paintSz(int i) {
    double x = -10 + i * 46;
    cell(x, -215, 40, 30, cSzF[i]);
    char vb[4]; snprintf(vb, sizeof vb, "%d", cSzV[i]);
    txt(x, -215, vb, 0, 15);
}

void draw() {
    erN = 0;
    for (int i = 0; i < NN; i++) {
        cTopFill[i] = rootCol[rootOf(i) % 8];
        cTopRing[i] = (i==hlA || i==hlB) ? 1 : 0;
        cFa[i] = gp->fa[i];
        cFy[i] = 150 - depthOf(i)*78;
        cFFill[i] = 15;
        if (gp->fa[i] == i) cFFill[i] = 13;
        if (i == hlNode) cFFill[i] = 5;
        cAOn[i] = (gp->fa[i] != i) ? 1 : 0;
        cACol[i] = 8;
        if (i == hlNode) cACol[i] = 1;
        if (i == mergeB && gp->fa[i] == mergeA) cACol[i] = 3;
        cFaV[i] = gp->fa[i]; cFaF[i] = (i==faFlash) ? 5 : 15;
        cSzV[i] = gp->sz[i]; cSzF[i] = (i==szFlash) ? 5 : 15;
    }
    cBlocks = blocks;

    int dt[NN], pt[NN], df[NN], pf[NN], da[NN], pa[NN];
    int dfa[NN], pfa[NN], dsz[NN], psz[NN];
    for (int i = 0; i < NN; i++) {
        dt[i] = (cTopFill[i]!=lTopFill[i] || cTopRing[i]!=lTopRing[i]) ? 1 : 0;
        pt[i] = dt[i];
        df[i] = (cFFill[i]!=lFFill[i] || cFy[i]!=lFy[i]) ? 1 : 0;
        pf[i] = df[i];
        da[i] = 0; pa[i] = 0;
        if (!cAOn[i]) { if (lAOn[i]) da[i] = 1; }
        else if (!lAOn[i]) pa[i] = 1;
        else {
            int p = cFa[i], lp = lFa[i];
            if (p!=lp || cFy[i]!=lFy[i] || cFy[p]!=lFy[p]) { da[i] = 1; pa[i] = 1; }
            else if (cACol[i] != lACol[i]) pa[i] = 1;
        }
        dfa[i] = (cFaV[i]!=lFaV[i] || cFaF[i]!=lFaF[i]) ? 1 : 0; pfa[i] = dfa[i];
        dsz[i] = (cSzV[i]!=lSzV[i] || cSzF[i]!=lSzF[i]) ? 1 : 0; psz[i] = dsz[i];
    }
    int dbl = (cBlocks!=lBlocks) ? 1 : 0, pbl = dbl;
    int dmsg = strcmp(msg, lmsg) != 0 ? 1 : 0, pmsg = dmsg;

    // ---- 擦除（只擦不画）：箭头旧走廊 -> 节点旧槽 -> 数组槽 ----
    for (int i = 0; i < NN; i++) if (da[i]) {
        double g[4];
        arrowGeom(i, lFa[i], lFy[i], lFy[lFa[i]], g);
        eraseSeg(g[0], g[1], g[2], g[3]);
        eraseBox(g[2], g[3], 30, 30);
    }
    for (int i = 0; i < NN; i++) if (dt[i]) eraseBox(nx(i), 245, 54, 54);
    for (int i = 0; i < NN; i++) if (df[i]) {
        eraseBox(nx(i), lFy[i], 46, 46);
        if (cFy[i] != lFy[i]) eraseBox(nx(i), cFy[i], 46, 46);
    }
    for (int i = 0; i < NN; i++) {
        if (dfa[i]) eraseBox(-10+i*46, -160, 42, 34);
        if (dsz[i]) eraseBox(-10+i*46, -215, 42, 34);
    }
    if (dbl) eraseBox(-280, -215, 70, 56);
    if (dmsg) eraseBox(-100, -280, 520, 26);

    // ---- 命中补画 ----
    for (int i = 0; i < NN; i++) if (cAOn[i]) {
        double g[4];
        arrowGeom(i, cFa[i], cFy[i], cFy[cFa[i]], g);
        if (segHitEr(g[0], g[1], g[2], g[3], 6)) pa[i] = 1;
    }
    for (int i = 0; i < NN; i++) if (pa[i]) { pf[i] = 1; pf[cFa[i]] = 1; }
    for (int i = 0; i < NN; i++) {
        if (rectHitEr(nx(i), 245, 54, 54)) pt[i] = 1;
        if (rectHitEr(nx(i), cFy[i], 46, 46)) pf[i] = 1;
        if (rectHitEr(-10+i*46, -160, 42, 34)) pfa[i] = 1;
        if (rectHitEr(-10+i*46, -215, 42, 34)) psz[i] = 1;
    }
    if (rectHitEr(-280, -215, 70, 56)) pbl = 1;
    if (rectHitEr(-100, -280, 520, 26)) pmsg = 1;

    // ---- 绘制（只画不擦）：箭头 -> 森林节点 -> 顶部节点 -> 数组 -> 计数 -> 消息 ----
    for (int i = 0; i < NN; i++) if (pa[i] && cAOn[i]) paintFEdge(i);
    for (int i = 0; i < NN; i++) if (pf[i]) paintForest(i);
    for (int i = 0; i < NN; i++) if (pt[i]) paintTop(i);
    for (int i = 0; i < NN; i++) { if (pfa[i]) paintFa(i); if (psz[i]) paintSz(i); }
    if (pbl) {
        char bb[8]; snprintf(bb, sizeof bb, "%d", cBlocks);
        txt(-280, -215, bb, 2, 44);
    }
    if (pmsg) txtL(-350, -280, msg, 2, 17);

    for (int i = 0; i < NN; i++) {
        lTopFill[i]=cTopFill[i]; lTopRing[i]=cTopRing[i];
        lFy[i]=cFy[i]; lFFill[i]=cFFill[i]; lFa[i]=cFa[i];
        lACol[i]=cACol[i]; lAOn[i]=cAOn[i];
        lFaV[i]=cFaV[i]; lFaF[i]=cFaF[i]; lSzV[i]=cSzV[i]; lSzF[i]=cSzF[i];
    }
    lBlocks = cBlocks;
    snprintf(lmsg, sizeof lmsg, "%s", msg);
}

// 路径减半：边找根边把父亲跳一级（同原版 find），每跳一帧
int DSU::find(int x) {
    while (fa[x] != x) {
        hlNode = x;
        snprintf(msg, sizeof msg, "find: %d parent jumps to grandparent %d", x, fa[fa[x]]);
        draw(); wait(0.05);
        fa[x] = fa[fa[x]];
        faFlash = x;
        draw(); wait(0.04);
        faFlash = -1;
        x = fa[x];
    }
    hlNode = -1;
    return x;
}
// 按大小合并（同原版 unite）：先找根，再把小根挂到大根下
bool DSU::unite(int a, int b) {
    hlA = a; hlB = b;
    snprintf(msg, sizeof msg, "unite(%d,%d): find roots", a, b);
    draw(); wait(0.05);
    a = find(a); b = find(b);
    hlA = -1; hlB = -1;
    if (a == b) {
        snprintf(msg, sizeof msg, "unite: same root %d, already connected", a);
        draw(); wait(0.06);
        return false;
    }
    if (sz[a] < sz[b]) std::swap(a, b);
    fa[b] = a; sz[a] += sz[b];
    mergeA = a; mergeB = b; faFlash = b; szFlash = a;
    blocks--;
    snprintf(msg, sizeof msg, "merge: root %d under root %d, blocks=%d", b, a, blocks);
    draw(); wait(0.06);
    mergeA = -1; mergeB = -1; faFlash = -1; szFlash = -1;
    return true;
}

int main() {
    pen.speed(10);
    DSU d(NN);
    gp = &d;
    initLast();
    drawStatic();
    int pairs[7][2] = {{0,1},{1,2},{3,4},{5,6},{6,7},{2,3},{0,4}};
    snprintf(msg, sizeof msg, "init: 8 single-node trees, blocks=8");
    draw(); wait(0.5);
    for (int i = 0; i < 7; i++) {
        d.unite(pairs[i][0], pairs[i][1]);
        draw(); wait(0.03);
    }
    int cnt = 0;
    for (int i = 0; i < NN; i++) if (d.find(i) == i) cnt++;
    blocks = cnt;
    snprintf(msg, sizeof msg, "count roots: blocks=%d", blocks);
    draw(); wait(0.4);
    bool c04 = d.find(0) == d.find(4);
    snprintf(msg, sizeof msg, "0 and 4 connected? %s", c04 ? "yes" : "no");
    draw(); wait(0.5);
    bool c05 = d.find(0) == d.find(5);
    snprintf(msg, sizeof msg, "0 and 5 connected? %s", c05 ? "yes" : "no");
    draw(); wait(0.5);
    printf("blocks=%d; 0-4 connected: yes; 0-5 connected: no\\n", blocks);
    return 0;
}
`,
  },
  '数组邻接表（前向星）与迭代遍历（画图版）': {
    group: 'GoC 可视化·图与哈希',
    stdin: '',
    code: `// 数组邻接表（前向星）与迭代遍历的可视化版。算法与数据同原版：7 个点、9 条无向边
// 存成 18 条有向边，head/to/nxt 三条定长数组，头插法建表，再数组栈 DFS、数组队列 BFS。
// 左边画 head/to/nxt 三个数组，右边画图，下面画访问顺序与栈/队列。
// 颜色：黄 = 正在扫描的数组条目/节点，绿 = 已访问，红 = 当前边，
//       橙 = 新边 nxt 指向的旧头（演示头插）。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int N = 7;
int head[7], to[20], nxt[20], ecnt = 0;
int edges[9][2] = {{0,1},{0,2},{1,3},{1,4},{2,4},{2,5},{3,6},{4,6},{5,6}};
const int m = 9;

double px[N] = {120,300,60,340,190,70,300};
double py[N] = {250,170,110,30,-10,-130,-170};

int phase = 0;                  // 0 建表 1 DFS 2 BFS
int builtE = 0;
int curE = -1, curHead = -1, oldHead = -1;
int curU = -1, curGraphEdge = -1;
int vis[N];
int order[N], ordN = 0;
int st[32], top = 0;
int q[32], qh = 0, qt = 0;
int treeEdge[9];
char msg[160];

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
// ---- 局部重绘基础设施：擦除矩形登记 + 命中补画 ----
const int MR = 18;
const int NB = 8;
const int MAXR = 3000;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;
void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN]=cx; erY[erN]=cy; erW[erN]=w; erH[erN]=h; erN++; }
}
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2-x1, dy = y2-y1, L = sqrt(dx*dx+dy*dy);
    int steps = (int)(L/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        eraseBox(x1+dx*t, y1+dy*t, 12, 12);
    }
}
int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx-erX[k])*2 <= w+erW[k] && fabs(cy-erY[k])*2 <= h+erH[k]) return 1;
    return 0;
}
int segHitEr(double x1, double y1, double x2, double y2, double mg) {
    double dx = x2-x1, dy = y2-y1;
    int steps = (int)(sqrt(dx*dx+dy*dy)/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        double x = x1+dx*t, y = y1+dy*t;
        for (int j = 0; j < erN; j++)
            if (fabs(x-erX[j]) <= erW[j]/2+mg && fabs(y-erY[j]) <= erH[j]/2+mg) return 1;
    }
    return 0;
}

void txt(double x, double y, const char* s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void cell(double x, double y, double w, double h, int fill) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().size(2).rr(w, h, fill).r(w, h, 0);
}

// ---- 当前帧 / 上一帧 ----
int cHeadV[N], cHeadF[N], cFill[N];
int cRowOn[MR], cRowF[MR];
int cEOn[9], cECol[9]; double cEW[9];
int cOrdV[NB], cStkV[NB];
int lHeadV[N], lHeadF[N], lFill[N];
int lRowOn[MR], lRowF[MR];
int lEOn[9], lECol[9]; double lEW[9];
int lOrdV[NB], lStkV[NB];
int lPhase = -1, lStkLab = -1;
char lmsg[160];

void initLast() {
    for (int i = 0; i < N; i++) { lHeadV[i]=-2; lHeadF[i]=-1; lFill[i]=-1; }
    for (int i = 0; i < MR; i++) { lRowOn[i]=0; lRowF[i]=-1; }
    for (int i = 0; i < 9; i++) { lEOn[i]=0; lECol[i]=-1; lEW[i]=0; }
    for (int i = 0; i < NB; i++) { lOrdV[i]=-1; lStkV[i]=-1; }
    lPhase=-1; lStkLab=-1; lmsg[0]=0;
}

// 静态背景：只画一次，全部落在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("数组邻接表（前向星）与迭代遍历", 0, 26);
    pen.c(8); seg(-15, 290, -15, -200, 1);
    txtL(-370, 285, "head[u] = first edge index", 8, 15);
    for (int u = 0; u < N; u++) {
        char ub[4]; snprintf(ub, sizeof ub, "%d", u);
        txt(-352 + u * 46, 278, ub, 8, 12);
    }
    txtL(-360, 205, "e", 8, 14);
    txtL(-270, 205, "to[e]", 8, 14);
    txtL(-140, 205, "nxt[e]", 8, 14);
    txtL(-370, -280, "visit order:", 8, 15);
    txtL(-370, -362, "yellow=scanning  green=visited  red=current edge", 8, 13);
}

void paintHead(int u) {
    double x = -352 + u * 46;
    cell(x, 250, 42, 30, cHeadF[u]);
    char vb[4]; snprintf(vb, sizeof vb, "%d", cHeadV[u]);
    txt(x, 250, vb, 0, 15);
}
void paintRow(int i) {
    double y = 178 - i * 21;
    char eb[4]; snprintf(eb, sizeof eb, "%d", i);
    txtL(-360, y, eb, 8, 13);
    cell(-270, y, 100, 19, cRowF[i]);
    char vb[4]; snprintf(vb, sizeof vb, "%d", to[i]);
    txt(-270, y, vb, 0, 13);
    cell(-140, y, 100, 19, cRowF[i]);
    snprintf(vb, sizeof vb, "%d", nxt[i]);
    txt(-140, y, vb, 0, 13);
}
void paintEdge(int i) {
    int u = edges[i][0], v = edges[i][1];
    pen.c(cECol[i]); seg(px[u], py[u], px[v], py[v], cEW[i]);
}
void paintNode(int i) {
    char lab[4]; snprintf(lab, sizeof lab, "%d", i);
    pen.setAngle(0);
    pen.pu().moveTo(px[i], py[i]).pd().size(2).oo(22, cFill[i]).o(22, 0);
    txt(px[i], py[i], lab, 0, 18);
}
void paintOrd(int i) {
    if (cOrdV[i] < 0) return;
    double x = -250 + i * 46;
    cell(x, -280, 40, 30, 3);
    char vb[4]; snprintf(vb, sizeof vb, "%d", cOrdV[i]);
    txt(x, -280, vb, 0, 15);
}
void paintStk(int i) {
    if (cStkV[i] < 0) return;
    double x = -250 + i * 46;
    cell(x, -330, 40, 30, 5);
    char vb[4]; snprintf(vb, sizeof vb, "%d", cStkV[i]);
    txt(x, -330, vb, 0, 15);
}

void draw() {
    erN = 0;
    for (int u = 0; u < N; u++) {
        cHeadV[u] = head[u];
        cHeadF[u] = (u == curHead) ? 5 : 15;
        cFill[u] = 15;
        if (vis[u]) cFill[u] = 3;
        if (u == curU) cFill[u] = 5;
    }
    for (int i = 0; i < MR; i++) {
        cRowOn[i] = (i < builtE) ? 1 : 0;
        cRowF[i] = 15;
        if (i == curE) cRowF[i] = 5;
        else if (i == oldHead) cRowF[i] = 14;
    }
    for (int i = 0; i < m; i++) {
        cEOn[i] = (phase == 0 && builtE < 2*i+2) ? 0 : 1;
        cECol[i] = 8; cEW[i] = 2;
        if (treeEdge[i]) { cECol[i] = 3; cEW[i] = 4; }
        if (i == curGraphEdge) { cECol[i] = 1; cEW[i] = 4; }
    }
    int sn = phase==2 ? (qt - qh) : top;
    for (int i = 0; i < NB; i++) {
        cOrdV[i] = i < ordN ? order[i] : -1;
        cStkV[i] = i < sn ? (phase==2 ? q[qh+i] : st[i]) : -1;
    }

    int dh[N], phead[N], dn[N], pn[N], dr[MR], pr[MR], de[9], pe[9];
    int dov[NB], pov[NB], dsv[NB], psv[NB];
    for (int u = 0; u < N; u++) {
        dh[u] = (cHeadV[u]!=lHeadV[u] || cHeadF[u]!=lHeadF[u]) ? 1 : 0;
        phead[u] = dh[u];
        dn[u] = (cFill[u]!=lFill[u]) ? 1 : 0; pn[u] = dn[u];
    }
    for (int i = 0; i < MR; i++) {
        dr[i] = (cRowOn[i]!=lRowOn[i] || (cRowOn[i] && cRowF[i]!=lRowF[i])) ? 1 : 0;
        pr[i] = dr[i];
    }
    for (int i = 0; i < m; i++) {
        de[i] = 0; pe[i] = 0;
        if (!cEOn[i]) { if (lEOn[i]) de[i] = 1; }
        else if (!lEOn[i]) pe[i] = 1;
        else {
            if (cEW[i] < lEW[i]) de[i] = 1;
            if (cECol[i]!=lECol[i] || cEW[i]!=lEW[i]) pe[i] = 1;
        }
    }
    for (int i = 0; i < NB; i++) {
        dov[i] = (cOrdV[i]!=lOrdV[i]) ? 1 : 0; pov[i] = dov[i];
        dsv[i] = (cStkV[i]!=lStkV[i]) ? 1 : 0; psv[i] = dsv[i];
    }
    int sl = phase==2 ? 1 : 0;
    int dph = (phase!=lPhase) ? 1 : 0, pph = dph;
    int dsl = (sl!=lStkLab) ? 1 : 0, psl = dsl;
    int dmsg = strcmp(msg, lmsg) != 0 ? 1 : 0, pmsg = dmsg;

    // ---- 擦除（只擦不画）----
    for (int i = 0; i < m; i++) if (de[i]) {
        int u = edges[i][0], v = edges[i][1];
        eraseSeg(px[u], py[u], px[v], py[v]);
    }
    for (int u = 0; u < N; u++) if (dh[u]) eraseBox(-352+u*46, 250, 44, 34);
    for (int i = 0; i < MR; i++) if (dr[i]) eraseBox(-230, 178-i*21, 284, 21);
    for (int i = 0; i < N; i++) if (dn[i]) eraseBox(px[i], py[i], 52, 52);
    for (int i = 0; i < NB; i++) {
        if (dov[i]) eraseBox(-250+i*46, -280, 44, 34);
        if (dsv[i]) eraseBox(-250+i*46, -330, 44, 34);
    }
    if (dmsg) eraseBox(-205, -205, 350, 24);
    if (dph) eraseBox(-200, -235, 360, 26);
    if (dsl) eraseBox(-330, -330, 90, 24);

    // ---- 命中补画：擦节点槽会切断穿过它的边，这里补回来 ----
    for (int i = 0; i < m; i++) if (cEOn[i]) {
        int u = edges[i][0], v = edges[i][1];
        if (segHitEr(px[u], py[u], px[v], py[v], 3)) pe[i] = 1;
    }
    for (int i = 0; i < m; i++) if (pe[i] && cEOn[i]) {
        pn[edges[i][0]] = 1; pn[edges[i][1]] = 1;
    }
    for (int i = 0; i < N; i++) if (rectHitEr(px[i], py[i], 52, 52)) pn[i] = 1;
    for (int u = 0; u < N; u++) if (rectHitEr(-352+u*46, 250, 44, 34)) phead[u] = 1;
    for (int i = 0; i < MR; i++) if (rectHitEr(-230, 178-i*21, 284, 21)) pr[i] = 1;
    for (int i = 0; i < NB; i++) {
        if (rectHitEr(-250+i*46, -280, 44, 34)) pov[i] = 1;
        if (rectHitEr(-250+i*46, -330, 44, 34)) psv[i] = 1;
    }
    if (rectHitEr(-205, -205, 350, 24)) pmsg = 1;
    if (rectHitEr(-200, -235, 360, 26)) pph = 1;
    if (rectHitEr(-330, -330, 90, 24)) psl = 1;

    // ---- 绘制（只画不擦）：边 -> 节点 -> head -> to/nxt -> 底部 ----
    for (int i = 0; i < m; i++) if (pe[i] && cEOn[i]) paintEdge(i);
    for (int i = 0; i < N; i++) if (pn[i]) paintNode(i);
    for (int u = 0; u < N; u++) if (phead[u]) paintHead(u);
    for (int i = 0; i < MR; i++) if (pr[i] && cRowOn[i]) paintRow(i);
    for (int i = 0; i < NB; i++) { if (pov[i]) paintOrd(i); if (psv[i]) paintStk(i); }
    if (pmsg) txtL(-370, -205, msg, 2, 15);
    if (pph) {
        const char* ph = phase==0 ? "building forward star (head insert)"
                       : (phase==1 ? "iterative DFS (array stack)" : "iterative BFS (array queue)");
        txtL(-370, -235, ph, 2, 18);
    }
    if (psl) txtL(-370, -330, phase==2 ? "queue:" : "stack:", 8, 15);

    for (int u = 0; u < N; u++) { lHeadV[u]=cHeadV[u]; lHeadF[u]=cHeadF[u]; lFill[u]=cFill[u]; }
    for (int i = 0; i < MR; i++) { lRowOn[i]=cRowOn[i]; lRowF[i]=cRowF[i]; }
    for (int i = 0; i < m; i++) { lEOn[i]=cEOn[i]; lECol[i]=cECol[i]; lEW[i]=cEW[i]; }
    for (int i = 0; i < NB; i++) { lOrdV[i]=cOrdV[i]; lStkV[i]=cStkV[i]; }
    lPhase = phase; lStkLab = sl;
    snprintf(lmsg, sizeof lmsg, "%s", msg);
}

int main() {
    pen.speed(10);
    for (int i = 0; i < N; i++) head[i] = -1;
    initLast();
    drawStatic();
    snprintf(msg, sizeof msg, "init: head all -1, insert 18 directed edges");
    draw(); wait(0.4);
    for (int i = 0; i < m; i++) {
        int u = edges[i][0], v = edges[i][1];
        for (int k = 0; k < 2; k++) {
            int from = (k==0?u:v), dst = (k==0?v:u);
            to[ecnt] = dst;
            nxt[ecnt] = head[from];
            oldHead = head[from];
            head[from] = ecnt;
            curE = ecnt; curHead = from; curGraphEdge = i;
            ecnt++; builtE = ecnt;
            snprintf(msg, sizeof msg, "add %d->%d: e=%d nxt=%d head[%d]=%d",
                     from, dst, curE, oldHead, from, curE);
            draw(); wait(0.05);
        }
    }
    curE = -1; curHead = -1; oldHead = -1; curGraphEdge = -1;
    wait(0.3);
    phase = 1;
    memset(vis, 0, sizeof vis);
    top = 0; st[top++] = 0; vis[0] = 1;
    draw(); wait(0.05);
    while (top > 0) {
        int u = st[--top];
        curU = u; order[ordN++] = u;
        draw(); wait(0.06);
        for (int e = head[u]; e != -1; e = nxt[e]) {
            curE = e; curGraphEdge = e/2;
            int v = to[e];
            snprintf(msg, sizeof msg, "pop %d: scan e=%d (to=%d)", u, e, v);
            draw(); wait(0.03);
            if (!vis[v]) { vis[v] = 1; st[top++] = v; treeEdge[e/2] = 1; draw(); wait(0.03); }
        }
        curE = -1; curGraphEdge = -1;
    }
    curU = -1;
    wait(0.3);
    phase = 2;
    memset(vis, 0, sizeof vis);
    memset(treeEdge, 0, sizeof treeEdge);
    ordN = 0; qh = qt = 0;
    q[qt++] = 0; vis[0] = 1;
    draw(); wait(0.05);
    while (qh < qt) {
        int u = q[qh++];
        curU = u; order[ordN++] = u;
        draw(); wait(0.06);
        for (int e = head[u]; e != -1; e = nxt[e]) {
            curE = e; curGraphEdge = e/2;
            int v = to[e];
            snprintf(msg, sizeof msg, "dequeue %d: scan e=%d (to=%d)", u, e, v);
            draw(); wait(0.03);
            if (!vis[v]) { vis[v] = 1; q[qt++] = v; treeEdge[e/2] = 1; draw(); wait(0.03); }
        }
        curE = -1; curGraphEdge = -1;
    }
    curU = -1;
    draw(); wait(0.6);
    printf("forward star: 18 edges; iterative DFS and BFS each visit all 7 nodes\\n");
    return 0;
}
`,
  },
  '邻接矩阵 + Floyd 全源最短路（画图版）': {
    group: 'GoC 可视化·图与哈希',
    stdin: '',
    code: `// 邻接矩阵 + Floyd 全源最短路：左边 5x5 距离矩阵，右边从 0 出发的最短路数值。
// 与原版同一组有向边、同一个三重循环 k/i/j。
// 颜色：黄 = 当前 k 行 k 列（中转十字），橙框 = 正在扫描的 i 行，
//       红 = 正在松弛的格子（显示旧值），绿 = 刚落定（显示新值），深绿字 = 被更新过。
#include <goc.h>
#include <cstdio>
#include <string>

const int N = 5;
const int INF = 1000000;
int d[N][N];
int upd[N][N];                 // 1 = 被松弛更新过
int curK = -1, curI = -1, curJ = -1;
int flash = 0;                 // 1 = 当前格子闪红
int relax = 0;
std::string msg;

std::string S(int v) { return std::to_string(v); }
double cx(int j) { return -280.0 + j * 70.0; }
double cy(int i) { return 190.0 - i * 54.0; }

// ---- 局部重绘：擦槽重画；格子几何不变，只变底色/数值时原位盖旧 ----
void eraseBox(double x, double y, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

int cFill[N][N], cScan[N][N], cVal[N][N], cUpd[N][N];
int lFill[N][N], lScan[N][N], lVal[N][N], lUpd[N][N];
int cResV[N], cResC[N], lResV[N], lResC[N];
int lK = -2, lRelax = -1;
std::string lmsg;

void initLast() {
    for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) {
        lFill[i][j]=-1; lScan[i][j]=-1; lVal[i][j]=-1; lUpd[i][j]=-1;
    }
    for (int j = 0; j < N; j++) { lResV[j]=-2; lResC[j]=-1; }
    lK=-2; lRelax=-1; lmsg="";
}

// 静态背景：只画一次，全部落在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("邻接矩阵 + Floyd 全源最短路", 0, 26);
    for (int j = 0; j < N; j++) { pen.setAngle(0); pen.pu().moveTo(cx(j), 237).pd().c(0).text(j, 0, 16); }
    for (int i = 0; i < N; i++) { pen.setAngle(0); pen.pu().moveTo(-345, cy(i)).pd().c(0).text(i, 0, 16); }
    pen.setAngle(0);
    pen.pu().moveTo(110, 150).pd().c(2).textL("从 0 出发的最短路", 2, 18);
    pen.pu().moveTo(-350, -120).pd().c(8).textL("有向边：0->1(4)  0->2(1)  2->1(2)  1->3(1)", 8, 15);
    pen.pu().moveTo(-350, -148).pd().c(8).textL("        2->3(5)  3->4(3)  0->3(100)", 8, 15);
    pen.pu().moveTo(-350, -345).pd().c(8).textL("黄 = k 行 k 列（中转十字）  红 = 正在松弛  绿 = 刚落定  深绿字 = 更新过", 8, 14);
}

void paintCell(int i, int j) {
    double x = cx(j), y = cy(i);
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(cFill[i][j]).rr(66, 48);
    pen.pu().moveTo(x, y).pd().c(cScan[i][j] ? 14 : 8).size(cScan[i][j] ? 3 : 1).r(66, 48);
    pen.setAngle(0);
    if (cVal[i][j] >= INF) {
        int tc = (cFill[i][j] == 1) ? 15 : 8;
        pen.pu().moveTo(x, y).pd().c(tc).text("INF", tc, 14);
    } else {
        int tc = (cFill[i][j] == 1) ? 15 : (cFill[i][j] == 3 ? 0 : (cUpd[i][j] ? 10 : 0));
        pen.pu().moveTo(x, y).pd().c(tc).text(cVal[i][j], tc, 17);
    }
}

void draw() {
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            cFill[i][j] = 15;
            if (curK >= 0 && (i == curK || j == curK)) cFill[i][j] = 5;
            if (curK >= 0 && i == curI && j == curJ) cFill[i][j] = flash ? 1 : 3;
            cScan[i][j] = (curK >= 0 && i == curI) ? 1 : 0;
            cVal[i][j] = d[i][j];
            cUpd[i][j] = upd[i][j];
        }
    }
    for (int j = 0; j < N; j++) {
        cResV[j] = d[0][j];
        cResC[j] = (curK >= 0 && curI == 0 && curJ == j) ? 14 : 0;
    }

    int dc[N][N], ec[N][N];
    for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) {
        dc[i][j] = (cFill[i][j]!=lFill[i][j] || cScan[i][j]!=lScan[i][j] ||
                    cVal[i][j]!=lVal[i][j] || cUpd[i][j]!=lUpd[i][j]) ? 1 : 0;
        ec[i][j] = (cScan[i][j] != lScan[i][j]) ? 1 : 0;   // 描边变细才需要擦
    }
    int dk = (curK != lK) ? 1 : 0;
    int dr = (relax != lRelax) ? 1 : 0;
    int dres[N], pres[N];
    for (int j = 0; j < N; j++) {
        dres[j] = (cResV[j]!=lResV[j] || cResC[j]!=lResC[j]) ? 1 : 0;
        pres[j] = dres[j];
    }
    int dmsg = (msg != lmsg) ? 1 : 0;

    // ---- 擦除（只擦不画）----
    for (int i = 0; i < N; i++) for (int j = 0; j < N; j++)
        if (ec[i][j]) eraseBox(cx(j), cy(i), 68, 52);
    if (dk) eraseBox(180, 235, 160, 30);
    if (dr) eraseBox(175, 195, 150, 26);
    for (int j = 0; j < N; j++) if (dres[j]) eraseBox(170, 112 - j * 36, 140, 26);
    if (dmsg) eraseBox(-50, -300, 620, 28);

    // ---- 绘制（只画不擦）----
    for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) if (dc[i][j]) paintCell(i, j);
    if (dk) {
        pen.setAngle(0);
        pen.pu().moveTo(110, 235).pd().c(0).textL("中转 k = " + (curK < 0 ? std::string("-") : S(curK)), 0, 22);
    }
    if (dr) {
        pen.setAngle(0);
        pen.pu().moveTo(110, 195).pd().c(0).textL("松弛次数 = " + S(relax), 0, 18);
    }
    for (int j = 0; j < N; j++) if (pres[j]) {
        std::string s = "0 -> " + S(j) + " = ";
        s += (cResV[j] >= INF ? std::string("INF") : S(cResV[j]));
        pen.setAngle(0);
        pen.pu().moveTo(110, 112 - j * 36).pd().c(cResC[j]).textL(s, cResC[j], 18);
    }
    if (dmsg) {
        pen.setAngle(0);
        pen.pu().moveTo(-350, -300).pd().c(1).textL(msg, 1, 18);
    }

    for (int i = 0; i < N; i++) for (int j = 0; j < N; j++) {
        lFill[i][j]=cFill[i][j]; lScan[i][j]=cScan[i][j]; lVal[i][j]=cVal[i][j]; lUpd[i][j]=cUpd[i][j];
    }
    for (int j = 0; j < N; j++) { lResV[j]=cResV[j]; lResC[j]=cResC[j]; }
    lK = curK; lRelax = relax; lmsg = msg;
}

int main() {
    pen.speed(10);
    initLast();
    drawStatic();
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) { d[i][j] = (i == j ? 0 : INF); upd[i][j] = 0; }
    int e[7][3] = {{0,1,4},{0,2,1},{2,1,2},{1,3,1},{2,3,5},{3,4,3},{0,3,100}};
    for (int k = 0; k < 7; k++) d[e[k][0]][e[k][1]] = e[k][2];
    msg = "初始矩阵：直接边权，其余 INF（对角线 0）";
    draw(); wait(0.6);
    // Floyd：k 在最外层，与原版完全一致
    for (int k = 0; k < N; k++) {
        curK = k; curI = -1; curJ = -1;
        msg = "k = " + S(k) + "：允许点 " + S(k) + " 作中转，扫全部 i,j";
        draw(); wait(0.35);
        for (int i = 0; i < N; i++) {
            curI = i; curJ = -1;
            draw(); wait(0.05);
            for (int j = 0; j < N; j++) {
                if (d[i][k] + d[k][j] < d[i][j]) {
                    int old = d[i][j], nv = d[i][k] + d[k][j];
                    curJ = j; flash = 1;
                    msg = "d[" + S(i) + "][" + S(j) + "]：" + S(old) + " -> " + S(d[i][k]) + "+" + S(d[k][j]) + "=" + S(nv) + "（经 k=" + S(k) + "）";
                    draw(); wait(0.18);          // 闪红：旧值
                    d[i][j] = nv;
                    upd[i][j] = 1; relax++;
                    flash = 0;
                    draw(); wait(0.18);          // 落定：新值标绿
                    curJ = -1;
                }
            }
        }
    }
    curK = -1; curI = -1; curJ = -1;
    msg = "完成：松弛 " + S(relax) + " 次；0->3 直达 100，绕行只要 4";
    draw(); wait(0.8);
    printf("Floyd 松弛 %d 次；0->3=%d（直达边 100），0->4=%d\\n", relax, d[0][3], d[0][4]);
    return 0;
}
`,
  },
  '拓扑排序（Kahn 数组队列）（画图版）': {
    group: 'GoC 可视化·图与哈希',
    stdin: '',
    code: `// 拓扑排序（Kahn 数组队列）：DAG 画在上方，节点右上角小圈是入度徽章。
// 与原版同一组边、同一个前向星 + 数组队列。入度 0 的点标黄入队；
// 出队时逐条删边（变灰）、邻点入度减一（徽章闪黄），新入度 0 的点再入队；
// 出队顺序在下方排成一行。结尾照原版加一条 6->0 红边演示有环。
// 颜色：蓝 = 未处理，黄 = 在队列，橙 = 正在出队/删边，绿 = 已出队，灰边 = 已删除。
#include <goc.h>
#include <cstdio>
#include <string>

const int N = 7, M = 8;
int head[N], to[M], nxt[M], from[M], indeg[N];
int q[16], qh = 0, qt = 0, order[16], cnt = 0;
int nodeState[N];              // 0 未处理 1 在队列 2 已出队
int edgeGone[M];
int hlNode = -1, hlEdge = -1, hlDeg = -1, hlPop = -1;
int showCycle = 0;
std::string msg;

double X[N] = {-310, -160, -160, 0, 150, 0, 300};
double Y[N] = {130, 220, 40, 160, 160, -20, 60};

std::string S(int v) { return std::to_string(v); }

void arrow(double x1, double y1, double x2, double y2, int col, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    double ux = dx / L, uy = dy / L;
    pen.pu().moveTo(x1, y1).pd().c(col).size(w).setAngle(atan2_deg(dx, dy)).fd(L);
    double bx = x2 - ux * 12, by = y2 - uy * 12;
    pen.polXY();
    pen.polXY(x2, y2);
    pen.polXY(bx - uy * 5, by + ux * 5);
    pen.polXY(bx + uy * 5, by - ux * 5);
    pen.c(col).pol(1, col);
}

void drawEdge(int e, int col, double w) {
    int u = from[e], v = to[e];
    double dx = X[v] - X[u], dy = Y[v] - Y[u];
    double L = sqrt(dx * dx + dy * dy);
    double ux = dx / L, uy = dy / L;
    arrow(X[u] + ux * 24, Y[u] + uy * 24, X[v] - ux * 27, Y[v] - uy * 27, col, w);
}

// ---- 局部重绘基础设施：擦除矩形登记 + 命中补画 ----
const int NQ = 8, NO = 8;
const int MAXR = 3000;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;
void eraseBox(double x, double y, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN]=x; erY[erN]=y; erW[erN]=w; erH[erN]=h; erN++; }
}
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2-x1, dy = y2-y1, L = sqrt(dx*dx+dy*dy);
    int steps = (int)(L/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        eraseBox(x1+dx*t, y1+dy*t, 12, 12);
    }
}
int rectHitEr(double x, double y, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(x-erX[k])*2 <= w+erW[k] && fabs(y-erY[k])*2 <= h+erH[k]) return 1;
    return 0;
}
int segHitEr(double x1, double y1, double x2, double y2, double mg) {
    double dx = x2-x1, dy = y2-y1;
    int steps = (int)(sqrt(dx*dx+dy*dy)/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        double x = x1+dx*t, y = y1+dy*t;
        for (int j = 0; j < erN; j++)
            if (fabs(x-erX[j]) <= erW[j]/2+mg && fabs(y-erY[j]) <= erH[j]/2+mg) return 1;
    }
    return 0;
}
void edgeGeom(int e, double* g) {
    int u = from[e], v = to[e];
    double dx = X[v]-X[u], dy = Y[v]-Y[u], L = sqrt(dx*dx+dy*dy);
    double ux = dx/L, uy = dy/L;
    g[0]=X[u]+ux*24; g[1]=Y[u]+uy*24; g[2]=X[v]-ux*27; g[3]=Y[v]-uy*27; g[4]=ux; g[5]=uy;
}

// ---- 当前帧 / 上一帧 ----
int cECol[M]; double cEW[M];
int cNCol[N], cTc[N], cBc[N], cDeg[N];
int cQV[NQ], cQF[NQ], cOV[NO], cHead, cCycle;
int lECol[M]; double lEW[M];
int lNCol[N], lTc[N], lBc[N], lDeg[N];
int lQV[NQ], lQF[NQ], lOV[NO], lHead = -1, lCycle = -1;
std::string lmsg;

void initLast() {
    for (int e = 0; e < M; e++) { lECol[e]=-1; lEW[e]=0; }
    for (int i = 0; i < N; i++) { lNCol[i]=-1; lTc[i]=-1; lBc[i]=-1; lDeg[i]=-1; }
    for (int i = 0; i < NQ; i++) { lQV[i]=-1; lQF[i]=-1; }
    for (int i = 0; i < NO; i++) lOV[i]=-1;
    lHead=-1; lCycle=-1; lmsg="";
}

// 静态背景：只画一次，全部落在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("拓扑排序（Kahn 数组队列）", 0, 26);
    pen.pu().moveTo(-350, -120).pd().c(0).textL("队列", 0, 18);
    pen.pu().moveTo(-350, -230).pd().c(0).textL("出队顺序", 0, 18);
    pen.pu().moveTo(-350, -345).pd().c(8).textL("黄 = 在队列  橙 = 正在出队/删边  绿 = 已出队  灰边 = 已删除", 8, 14);
}

void paintNode(int i) {
    pen.setAngle(0);
    pen.pu().moveTo(X[i], Y[i]).pd().c(cNCol[i]).size(2).oo(24);
    pen.setAngle(0);
    pen.pu().moveTo(X[i], Y[i]).pd().c(cTc[i]).text(i, cTc[i], 18);
    pen.setAngle(0);
    pen.pu().moveTo(X[i]+22, Y[i]+22).pd().c(cBc[i]).size(1.5).oo(12);
    pen.setAngle(0);
    pen.pu().moveTo(X[i]+22, Y[i]+22).pd().c(0).text(cDeg[i], 0, 13);
}
void paintCycle() {
    pen.setAngle(0);
    pen.pu().moveTo(X[6]+12, Y[6]-20).pd().c(1).size(3);
    pen.lineTo(345, -70);
    pen.lineTo(-345, -70);
    arrow(-345, -70, X[0]-10, Y[0]-26, 1, 3);
}
void eraseCycle() {
    eraseSeg(X[6]+12, Y[6]-20, 345, -70);
    eraseSeg(345, -70, -345, -70);
    eraseSeg(-345, -70, X[0]-10, Y[0]-26);
    double dx = (X[0]-10)-(-345), dy = (Y[0]-26)-(-70), L = sqrt(dx*dx+dy*dy);
    eraseBox(X[0]-10 - dx/L*6, Y[0]-26 - dy/L*6, 28, 28);
}
int cycleHit() {
    if (segHitEr(X[6]+12, Y[6]-20, 345, -70, 4)) return 1;
    if (segHitEr(345, -70, -345, -70, 4)) return 1;
    if (segHitEr(-345, -70, X[0]-10, Y[0]-26, 6)) return 1;
    return 0;
}
void paintQueue(int j) {
    if (cQV[j] < 0) return;
    double x = -270 + j * 46;
    pen.setAngle(0);
    pen.pu().moveTo(x, -120).pd().c(cQF[j]).rr(40, 34);
    pen.pu().moveTo(x, -120).pd().c(8).size(1.5).r(40, 34);
    pen.setAngle(0);
    pen.pu().moveTo(x, -120).pd().c(0).text(cQV[j], 0, 16);
}
void paintOrder(int i) {
    if (cOV[i] < 0) return;
    double x = -230 + i * 50;
    pen.setAngle(0);
    pen.pu().moveTo(x, -230).pd().c(3).rr(42, 36);
    pen.setAngle(0);
    pen.pu().moveTo(x, -230).pd().c(0).text(cOV[i], 0, 17);
}

void draw() {
    erN = 0;
    for (int e = 0; e < M; e++) {
        cECol[e] = edgeGone[e] ? 8 : 2;
        cEW[e] = edgeGone[e] ? 1.5 : 2;
        if (e == hlEdge) { cECol[e] = 14; cEW[e] = 4; }
    }
    for (int i = 0; i < N; i++) {
        cNCol[i] = nodeState[i] == 2 ? 3 : (nodeState[i] == 1 ? 5 : 2);
        if (i == hlNode) cNCol[i] = 14;
        cTc[i] = (cNCol[i] == 2) ? 15 : 0;
        cBc[i] = (i == hlDeg) ? 5 : 15;
        cDeg[i] = indeg[i];
    }
    for (int j = 0; j < NQ; j++) {
        int i = qh + j;
        cQV[j] = (i < qt) ? q[i] : -1;
        cQF[j] = (i < qt && i == hlPop) ? 5 : 15;
    }
    for (int i = 0; i < NO; i++) cOV[i] = i < cnt ? order[i] : -1;
    cHead = (qh < qt) ? 1 : 0;
    cCycle = showCycle;

    int de[M], pe[M], dn[N], pn[N], dq[NQ], pq[NQ], dov[NO], pov[NO];
    for (int e = 0; e < M; e++) {
        de[e] = (cEW[e] < lEW[e]) ? 1 : 0;
        pe[e] = (cECol[e]!=lECol[e] || cEW[e]!=lEW[e]) ? 1 : 0;
    }
    for (int i = 0; i < N; i++) {
        dn[i] = (cNCol[i]!=lNCol[i] || cTc[i]!=lTc[i] || cBc[i]!=lBc[i] || cDeg[i]!=lDeg[i]) ? 1 : 0;
        pn[i] = dn[i];
    }
    for (int j = 0; j < NQ; j++) { dq[j] = (cQV[j]!=lQV[j] || cQF[j]!=lQF[j]) ? 1 : 0; pq[j] = dq[j]; }
    for (int i = 0; i < NO; i++) { dov[i] = (cOV[i]!=lOV[i]) ? 1 : 0; pov[i] = dov[i]; }
    int dhead = (cHead!=lHead) ? 1 : 0, phead = dhead;
    int dcyc = (cCycle!=lCycle) ? 1 : 0, pcyc = (cCycle && dcyc) ? 1 : 0;
    int dmsg = (msg != lmsg) ? 1 : 0, pmsg = dmsg;

    // ---- 擦除（只擦不画）----
    for (int e = 0; e < M; e++) if (de[e]) {
        double g[6]; edgeGeom(e, g);
        eraseSeg(g[0], g[1], g[2], g[3]);
        eraseBox(g[2]-g[4]*6, g[3]-g[5]*6, 28, 28);
    }
    if (dcyc && !cCycle) eraseCycle();
    for (int i = 0; i < N; i++) if (dn[i]) eraseBox(X[i]+5, Y[i]+5, 64, 64);
    for (int j = 0; j < NQ; j++) if (dq[j]) eraseBox(-270+j*46, -120, 44, 38);
    for (int i = 0; i < NO; i++) if (dov[i]) eraseBox(-230+i*50, -230, 46, 40);
    if (dhead) eraseBox(-270, -152, 50, 20);
    if (dmsg) eraseBox(-30, 295, 660, 28);

    // ---- 命中补画：擦节点槽会切断穿过它的边/回边，这里补回来 ----
    for (int e = 0; e < M; e++) {
        double g[6]; edgeGeom(e, g);
        if (segHitEr(g[0], g[1], g[2], g[3], 6)) pe[e] = 1;
    }
    for (int e = 0; e < M; e++) if (pe[e]) { pn[from[e]] = 1; pn[to[e]] = 1; }
    if (cCycle && cycleHit()) pcyc = 1;
    if (pcyc) { pn[0] = 1; pn[6] = 1; }
    for (int i = 0; i < N; i++) if (rectHitEr(X[i]+5, Y[i]+5, 64, 64)) pn[i] = 1;
    for (int j = 0; j < NQ; j++) if (rectHitEr(-270+j*46, -120, 44, 38)) pq[j] = 1;
    for (int i = 0; i < NO; i++) if (rectHitEr(-230+i*50, -230, 46, 40)) pov[i] = 1;
    if (rectHitEr(-270, -152, 50, 20)) phead = 1;
    if (rectHitEr(-30, 295, 660, 28)) pmsg = 1;

    // ---- 绘制（只画不擦）：边 -> 回边 -> 节点 -> 队列 -> 顺序 -> 消息 ----
    for (int e = 0; e < M; e++) if (pe[e]) drawEdge(e, cECol[e], cEW[e]);
    if (pcyc) paintCycle();
    for (int i = 0; i < N; i++) if (pn[i]) paintNode(i);
    for (int j = 0; j < NQ; j++) if (pq[j]) paintQueue(j);
    if (phead && cHead) {
        pen.setAngle(0);
        pen.pu().moveTo(-270, -152).pd().c(14).text("队头", 14, 13);
    }
    for (int i = 0; i < NO; i++) if (pov[i]) paintOrder(i);
    if (pmsg) {
        pen.setAngle(0);
        pen.pu().moveTo(-350, 295).pd().c(1).textL(msg, 1, 18);
    }

    for (int e = 0; e < M; e++) { lECol[e]=cECol[e]; lEW[e]=cEW[e]; }
    for (int i = 0; i < N; i++) { lNCol[i]=cNCol[i]; lTc[i]=cTc[i]; lBc[i]=cBc[i]; lDeg[i]=cDeg[i]; }
    for (int j = 0; j < NQ; j++) { lQV[j]=cQV[j]; lQF[j]=cQF[j]; }
    for (int i = 0; i < NO; i++) lOV[i]=cOV[i];
    lHead=cHead; lCycle=cCycle; lmsg=msg;
}

int main() {
    pen.speed(10);
    int edges[M][2] = {{0,1},{0,2},{1,3},{2,3},{3,4},{2,5},{5,6},{4,6}};
    for (int i = 0; i < N; i++) { head[i] = -1; indeg[i] = 0; nodeState[i] = 0; }
    for (int i = 0; i < M; i++) {          // 前向星头插法，与原版一致
        int u = edges[i][0], v = edges[i][1];
        from[i] = u; to[i] = v; nxt[i] = head[u]; head[u] = i;
        indeg[v]++;
        edgeGone[i] = 0;
    }
    initLast();
    drawStatic();
    msg = "算好各点入度（右上角徽章），入度 0 的入队";
    draw(); wait(0.5);
    for (int i = 0; i < N; i++) if (indeg[i] == 0) {
        q[qt++] = i; nodeState[i] = 1; hlNode = i;
        msg = "indeg[" + S(i) + "] = 0 -> 入队";
        draw(); wait(0.3);
    }
    hlNode = -1;
    while (qh < qt) {
        int u = q[qh];
        hlPop = qh; hlNode = u;
        msg = "出队 " + S(u) + "，加入拓扑序";
        draw(); wait(0.2);
        qh++; order[cnt++] = u; nodeState[u] = 2; hlPop = -1;
        for (int e = head[u]; e != -1; e = nxt[e]) {
            int v = to[e];
            hlEdge = e; hlDeg = v;
            msg = "删边 " + S(u) + "->" + S(v) + "，indeg[" + S(v) + "]--";
            draw(); wait(0.18);
            edgeGone[e] = 1;
            if (--indeg[v] == 0) {
                q[qt++] = v; nodeState[v] = 1;
                msg = "indeg[" + S(v) + "] = 0 -> 入队";
                draw(); wait(0.18);
            }
        }
        hlEdge = -1; hlDeg = -1; hlNode = -1;
        draw(); wait(0.1);
    }
    int okCnt = cnt;
    msg = "出队 " + S(cnt) + " 个点 = 顶点数 -> 无环，拓扑序完成";
    draw(); wait(0.6);
    // 与原版一致：再加 6->0 造环，入度全 >=1，一个点都排不出
    int indeg2[N] = {1, 1, 1, 2, 1, 1, 2};
    for (int i = 0; i < N; i++) { indeg[i] = indeg2[i]; nodeState[i] = 0; }
    qh = qt = cnt = 0; showCycle = 1;
    msg = "再加 6->0（红边）：入度全 >=1，队列空，排出 0 个点 -> 有环";
    draw(); wait(0.9);
    printf("拓扑序：");
    for (int i = 0; i < okCnt; i++) printf("%d ", order[i]);
    printf("（无环）；加 6->0 后排出 0 个点，检测到环\\n");
    return 0;
}
`,
  },
  '最小生成树：Prim + Kruskal（画图版）': {
    group: 'GoC 可视化·图与哈希',
    stdin: '',
    code: `// 最小生成树：同一张 6 点 9 边带权图，上半 Prim 从 0 长树，下半 Kruskal 排序+并查集。
// 算法与数据与原版完全一致（Prim 用 lowcost，Kruskal 手写选择排序 + 数组并查集）。
// 颜色：黄 = 候选边/正在考察，橙 = 当前选中的边，绿 = 已选中（树边），红 = 成环被跳过，灰 = 未选。
// Prim 的 low[v] 标在非树节点下方；Kruskal 的排序边条与 fa 数组画在中间。
#include <goc.h>
#include <cstdio>
#include <string>

const int N = 6, M = 9, INF = 1000000;
struct Edge { int u, v, w; };
Edge e[M] = {{0,1,4},{0,2,2},{1,2,1},{1,3,5},{2,3,8},{2,4,10},{3,4,2},{3,5,6},{4,5,3}};
Edge sorted[M];
int fa[N];
int find(int x) { while (fa[x] != x) { fa[x] = fa[fa[x]]; x = fa[x]; } return x; }
bool unite(int a, int b) { a = find(a); b = find(b); if (a == b) return false; fa[b] = a; return true; }

double PX[N] = {-250, -110, -110, 40, 40, 190};
double PY[N] = {0, 70, -70, 70, -70, 0};
double topY(int i) { return 190 + PY[i] * 0.75; }
double botY(int i) { return -195 + PY[i] * 0.75; }

int inTree[N], low[N], lowFrom[N], primSel[M];
int hlPrimEdge = -1, hlPrimNode = -1;
long long primCost = 0;
int kState[M];                 // 0 未考察 2 选中 3 成环跳过（按排序后的下标）
int posOfOrig[M];              // 原边下标 -> 排序后下标
int hlKEdge = -1, hlFa = -1;
long long kCost = 0;
int sortedShown = 0;
std::string primMsg, kMsg;

std::string S(int v) { return std::to_string(v); }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void weightLabel(double x, double y, int w) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(15).rr(24, 16);
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(0).text(w, 0, 13);
}

int origIdx(Edge ed) {
    for (int k = 0; k < M; k++)
        if (e[k].u == ed.u && e[k].v == ed.v && e[k].w == ed.w) return k;
    return -1;
}

// ---- 局部重绘基础设施：擦除矩形登记 + 命中补画 ----
const int MAXR = 4000;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;
void eraseBox(double x, double y, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN]=x; erY[erN]=y; erW[erN]=w; erH[erN]=h; erN++; }
}
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2-x1, dy = y2-y1, L = sqrt(dx*dx+dy*dy);
    int steps = (int)(L/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        eraseBox(x1+dx*t, y1+dy*t, 12, 12);
    }
}
int rectHitEr(double x, double y, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(x-erX[k])*2 <= w+erW[k] && fabs(y-erY[k])*2 <= h+erH[k]) return 1;
    return 0;
}
int segHitEr(double x1, double y1, double x2, double y2, double mg) {
    double dx = x2-x1, dy = y2-y1;
    int steps = (int)(sqrt(dx*dx+dy*dy)/6.0)+1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k/steps;
        double x = x1+dx*t, y = y1+dy*t;
        for (int j = 0; j < erN; j++)
            if (fabs(x-erX[j]) <= erW[j]/2+mg && fabs(y-erY[j]) <= erH[j]/2+mg) return 1;
    }
    return 0;
}

double tlx[M], tly[M], blx[M], bly[M];
void geom() {
    for (int k = 0; k < M; k++) {
        tlx[k] = (PX[e[k].u] + PX[e[k].v]) / 2;
        tly[k] = (topY(e[k].u) + topY(e[k].v)) / 2;
        blx[k] = tlx[k];
        bly[k] = (botY(e[k].u) + botY(e[k].v)) / 2;
    }
}

// ---- 当前帧 / 上一帧 ----
int cTECol[M]; double cTEW[M];
int cBECol[M]; double cBEW[M];
int cTNCol[N], cTNTc[N], cTLowOn[N], cTLowV[N];
int cBarCol[M], cBarU[M], cBarV[M], cBarW[M];
int cFaV[N], cFaCol[N];
int lTECol[M]; double lTEW[M];
int lBECol[M]; double lBEW[M];
int lTNCol[N], lTNTc[N], lTLowOn[N], lTLowV[N];
int lBarCol[M], lBarU[M], lBarV[M], lBarW[M];
int lFaV[N], lFaCol[N];
int lBotDone = 0;
std::string lPrimMsg, lKMsg;

void initLast() {
    for (int k = 0; k < M; k++) {
        lTECol[k]=-1; lTEW[k]=0; lBECol[k]=-1; lBEW[k]=0;
        lBarCol[k]=-1; lBarU[k]=-1; lBarV[k]=-1; lBarW[k]=-1;
    }
    for (int i = 0; i < N; i++) {
        lTNCol[i]=-1; lTNTc[i]=-1; lTLowOn[i]=-1; lTLowV[i]=-1;
        lFaV[i]=-1; lFaCol[i]=-1;
    }
    lBotDone=0; lPrimMsg=""; lKMsg="";
}

// 静态背景：只画一次，全部落在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("最小生成树：Prim + Kruskal", 0, 26);
    pen.pu().moveTo(-350, 292).pd().c(2).textL("Prim：从 0 号点长树（黄 = 候选边，绿 = 树边）", 2, 16);
    pen.pu().moveTo(-350, 58).pd().c(0).textL("Kruskal：选择排序按权排好，再并查集判环", 0, 16);
    pen.pu().moveTo(-350, -52).pd().c(0).textL("并查集 fa", 0, 15);
    pen.pu().moveTo(-350, -100).pd().c(2).textL("Kruskal：按权排序 + 并查集（红 = 成环跳过）", 2, 16);
    pen.pu().moveTo(-350, -345).pd().c(8).textL("同一张图两种算法，总权值都应为 13", 8, 14);
}

void paintTNode(int i) {
    pen.setAngle(0);
    pen.pu().moveTo(PX[i], topY(i)).pd().c(cTNCol[i]).size(2).oo(20);
    pen.setAngle(0);
    pen.pu().moveTo(PX[i], topY(i)).pd().c(cTNTc[i]).text(i, cTNTc[i], 16);
    if (cTLowOn[i]) {
        std::string s = "low ";
        s += (cTLowV[i] >= INF ? std::string("INF") : S(cTLowV[i]));
        pen.setAngle(0);
        pen.pu().moveTo(PX[i], topY(i) - 32).pd().c(8).text(s, 8, 12);
    }
}
void paintBNode(int i) {
    pen.setAngle(0);
    pen.pu().moveTo(PX[i], botY(i)).pd().c(2).size(2).oo(20);
    pen.setAngle(0);
    pen.pu().moveTo(PX[i], botY(i)).pd().c(15).text(i, 15, 16);
}
void paintBar(int i) {
    double x = -330 + i * 74;
    pen.setAngle(0);
    pen.pu().moveTo(x, 22).pd().c(cBarCol[i]).rr(70, 26);
    pen.setAngle(0);
    pen.pu().moveTo(x, 22).pd().c(8).size(1).r(70, 26);
    std::string s = S(cBarU[i]) + "-" + S(cBarV[i]) + ":" + S(cBarW[i]);
    int tc = (cBarCol[i] == 1) ? 15 : 0;
    pen.setAngle(0);
    pen.pu().moveTo(x, 22).pd().c(tc).text(s, tc, 13);
}
void paintFa(int i) {
    double x = -220 + i * 42;
    pen.setAngle(0);
    pen.pu().moveTo(x, -52).pd().c(cFaCol[i]).rr(36, 24);
    pen.setAngle(0);
    pen.pu().moveTo(x, -52).pd().c(8).size(1).r(36, 24);
    pen.setAngle(0);
    pen.pu().moveTo(x, -52).pd().c(0).text(cFaV[i], 0, 14);
    pen.setAngle(0);
    pen.pu().moveTo(x, -72).pd().c(8).text(i, 8, 11);
}

void draw() {
    erN = 0;
    for (int k = 0; k < M; k++) {
        int u = e[k].u, v = e[k].v;
        cTECol[k] = 8; cTEW[k] = 1.5;
        if (primSel[k]) { cTECol[k] = 3; cTEW[k] = 4; }
        else {
            int cand = 0;                  // 候选边：树到非树点的最便宜边
            if (inTree[u] && !inTree[v] && low[v] == e[k].w && lowFrom[v] == u) cand = 1;
            if (inTree[v] && !inTree[u] && low[u] == e[k].w && lowFrom[u] == v) cand = 1;
            if (cand) { cTECol[k] = 5; cTEW[k] = 3; }
        }
        if (k == hlPrimEdge) { cTECol[k] = 14; cTEW[k] = 4.5; }
        int sp = posOfOrig[k];
        cBECol[k] = 8; cBEW[k] = 1.5;
        if (kState[sp] == 2) { cBECol[k] = 3; cBEW[k] = 4; }
        else if (kState[sp] == 3) { cBECol[k] = 1; cBEW[k] = 3; }
        if (sp == hlKEdge) { cBECol[k] = 14; cBEW[k] = 4.5; }
        Edge ed = sortedShown ? sorted[k] : e[k];
        cBarU[k] = ed.u; cBarV[k] = ed.v; cBarW[k] = ed.w;
        cBarCol[k] = 15;
        if (sortedShown) {
            if (kState[k] == 2) cBarCol[k] = 3;
            else if (kState[k] == 3) cBarCol[k] = 1;
            if (k == hlKEdge) cBarCol[k] = 5;
        }
    }
    for (int i = 0; i < N; i++) {
        cTNCol[i] = inTree[i] ? 3 : 2;
        if (i == hlPrimNode) cTNCol[i] = 14;
        cTNTc[i] = (cTNCol[i] == 2) ? 15 : 0;
        cTLowOn[i] = inTree[i] ? 0 : 1;
        cTLowV[i] = low[i];
        cFaV[i] = fa[i];
        cFaCol[i] = (i == hlFa) ? 5 : 15;
    }

    int dte[M], pte[M], ptl[M], dbe[M], pbe[M], pbl[M];
    int dtn[N], ptn[N], dbn[N], pbn[N], dbar[M], pbar[M], dfa[N], pfa[N];
    for (int k = 0; k < M; k++) {
        dte[k] = (cTEW[k] < lTEW[k]) ? 1 : 0;
        pte[k] = (cTECol[k]!=lTECol[k] || cTEW[k]!=lTEW[k]) ? 1 : 0;
        ptl[k] = pte[k];
        dbe[k] = (cBEW[k] < lBEW[k]) ? 1 : 0;
        pbe[k] = (cBECol[k]!=lBECol[k] || cBEW[k]!=lBEW[k]) ? 1 : 0;
        pbl[k] = pbe[k];
        dbar[k] = (cBarCol[k]!=lBarCol[k] || cBarU[k]!=lBarU[k] ||
                   cBarV[k]!=lBarV[k] || cBarW[k]!=lBarW[k]) ? 1 : 0;
        pbar[k] = dbar[k];
    }
    for (int i = 0; i < N; i++) {
        dtn[i] = (cTNCol[i]!=lTNCol[i] || cTNTc[i]!=lTNTc[i] ||
                  cTLowOn[i]!=lTLowOn[i] || cTLowV[i]!=lTLowV[i]) ? 1 : 0;
        ptn[i] = dtn[i];
        dbn[i] = lBotDone ? 0 : 1; pbn[i] = dbn[i];
        dfa[i] = (cFaV[i]!=lFaV[i] || cFaCol[i]!=lFaCol[i]) ? 1 : 0; pfa[i] = dfa[i];
    }
    int dpm = (primMsg != lPrimMsg) ? 1 : 0, ppm = dpm;
    int dkm = (kMsg != lKMsg) ? 1 : 0, pkm = dkm;

    // ---- 擦除（只擦不画）----
    for (int k = 0; k < M; k++) if (dte[k])
        eraseSeg(PX[e[k].u], topY(e[k].u), PX[e[k].v], topY(e[k].v));
    for (int k = 0; k < M; k++) if (dbe[k])
        eraseSeg(PX[e[k].u], botY(e[k].u), PX[e[k].v], botY(e[k].v));
    for (int i = 0; i < N; i++) if (dtn[i]) eraseBox(PX[i], topY(i)-8.5, 52, 61);
    for (int i = 0; i < N; i++) if (dbn[i]) eraseBox(PX[i], botY(i), 46, 46);
    for (int k = 0; k < M; k++) if (dbar[k]) eraseBox(-330+k*74, 22, 72, 30);
    for (int i = 0; i < N; i++) if (dfa[i]) eraseBox(-220+i*42, -59, 40, 44);
    if (dpm) eraseBox(-150, 95, 420, 22);
    if (dkm) eraseBox(-150, -18, 420, 26);

    // ---- 命中补画：擦节点槽会切断穿过它的边，权值标签压在边线上也要补 ----
    for (int k = 0; k < M; k++)
        if (segHitEr(PX[e[k].u], topY(e[k].u), PX[e[k].v], topY(e[k].v), 4)) pte[k] = 1;
    for (int k = 0; k < M; k++)
        if (segHitEr(PX[e[k].u], botY(e[k].u), PX[e[k].v], botY(e[k].v), 4)) pbe[k] = 1;
    int anyT = 0, anyB = 0;
    for (int k = 0; k < M; k++) { if (pte[k]) anyT = 1; if (pbe[k]) anyB = 1; }
    for (int k = 0; k < M; k++) {
        if (anyT) { ptl[k] = 1; ptn[e[k].u] = 1; ptn[e[k].v] = 1; }
        if (anyB) { pbl[k] = 1; pbn[e[k].u] = 1; pbn[e[k].v] = 1; }
        if (rectHitEr(tlx[k], tly[k], 28, 20)) ptl[k] = 1;
        if (rectHitEr(blx[k], bly[k], 28, 20)) pbl[k] = 1;
        if (rectHitEr(-330+k*74, 22, 72, 30)) pbar[k] = 1;
    }
    for (int i = 0; i < N; i++) {
        if (rectHitEr(PX[i], topY(i)-8.5, 52, 61)) ptn[i] = 1;
        if (rectHitEr(PX[i], botY(i), 46, 46)) pbn[i] = 1;
        if (rectHitEr(-220+i*42, -59, 40, 44)) pfa[i] = 1;
    }
    if (rectHitEr(-150, 95, 420, 22)) ppm = 1;
    if (rectHitEr(-150, -18, 420, 26)) pkm = 1;

    // ---- 绘制（只画不擦）：上半图 -> 中间条/数组 -> 下半图 ----
    for (int k = 0; k < M; k++) if (pte[k]) {
        pen.c(cTECol[k]);
        seg(PX[e[k].u], topY(e[k].u), PX[e[k].v], topY(e[k].v), cTEW[k]);
    }
    for (int k = 0; k < M; k++) if (ptl[k]) weightLabel(tlx[k], tly[k], e[k].w);
    for (int i = 0; i < N; i++) if (ptn[i]) paintTNode(i);
    if (ppm) {
        pen.setAngle(0);
        pen.pu().moveTo(-350, 95).pd().c(1).textL(primMsg, 1, 17);
    }
    for (int k = 0; k < M; k++) if (pbar[k]) paintBar(k);
    if (pkm) {
        pen.setAngle(0);
        pen.pu().moveTo(-350, -18).pd().c(1).textL(kMsg, 1, 17);
    }
    for (int i = 0; i < N; i++) if (pfa[i]) paintFa(i);
    for (int k = 0; k < M; k++) if (pbe[k]) {
        pen.c(cBECol[k]);
        seg(PX[e[k].u], botY(e[k].u), PX[e[k].v], botY(e[k].v), cBEW[k]);
    }
    for (int k = 0; k < M; k++) if (pbl[k]) weightLabel(blx[k], bly[k], e[k].w);
    for (int i = 0; i < N; i++) if (pbn[i]) paintBNode(i);

    for (int k = 0; k < M; k++) {
        lTECol[k]=cTECol[k]; lTEW[k]=cTEW[k]; lBECol[k]=cBECol[k]; lBEW[k]=cBEW[k];
        lBarCol[k]=cBarCol[k]; lBarU[k]=cBarU[k]; lBarV[k]=cBarV[k]; lBarW[k]=cBarW[k];
    }
    for (int i = 0; i < N; i++) {
        lTNCol[i]=cTNCol[i]; lTNTc[i]=cTNTc[i]; lTLowOn[i]=cTLowOn[i]; lTLowV[i]=cTLowV[i];
        lFaV[i]=cFaV[i]; lFaCol[i]=cFaCol[i];
    }
    lBotDone = 1; lPrimMsg = primMsg; lKMsg = kMsg;
}

int main() {
    pen.speed(10);
    int g[N][N];
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) g[i][j] = INF;
    for (int k = 0; k < M; k++) { g[e[k].u][e[k].v] = e[k].w; g[e[k].v][e[k].u] = e[k].w; }
    for (int i = 0; i < N; i++) { low[i] = g[0][i]; inTree[i] = 0; lowFrom[i] = 0; fa[i] = i; }
    for (int k = 0; k < M; k++) { primSel[k] = 0; kState[k] = 0; posOfOrig[k] = k; }
    inTree[0] = 1;
    primMsg = "Prim：0 入树，low[v] = 树到 v 的最便宜边";
    geom();
    initLast();
    drawStatic();
    kMsg = "（Prim 完成后开始 Kruskal）";
    draw(); wait(0.5);
    // Prim：与原版一致的 lowcost 写法
    for (int k = 1; k < N; k++) {
        int v = -1;
        for (int i = 0; i < N; i++) if (!inTree[i] && (v < 0 || low[i] < low[v])) v = i;
        int ek = -1;                       // 找到这条最小候选边，画高亮
        for (int t = 0; t < M; t++) {
            int u = e[t].u, vv = e[t].v;
            if ((u == lowFrom[v] && vv == v) || (vv == lowFrom[v] && u == v)) { ek = t; break; }
        }
        hlPrimEdge = ek; hlPrimNode = v;
        primMsg = "选最小候选：接 " + S(v) + "，边权 " + S(low[v]);
        draw(); wait(0.25);
        primCost += low[v]; inTree[v] = 1;
        if (ek >= 0) primSel[ek] = 1;
        for (int i = 0; i < N; i++) if (!inTree[i] && g[v][i] < low[i]) { low[i] = g[v][i]; lowFrom[i] = v; }
        hlPrimEdge = -1; hlPrimNode = -1;
        primMsg = S(v) + " 入树，更新 low；总权值 = " + S((int)primCost);
        draw(); wait(0.2);
    }
    primMsg = "Prim 完成：总权值 = " + S((int)primCost);
    draw(); wait(0.3);
    // Kruskal：手写选择排序，与原版一致
    for (int i = 0; i < M; i++) sorted[i] = e[i];
    for (int i = 0; i < M - 1; i++) {
        int m = i;
        for (int j = i + 1; j < M; j++) if (sorted[j].w < sorted[m].w) m = j;
        Edge t = sorted[i]; sorted[i] = sorted[m]; sorted[m] = t;
    }
    for (int i = 0; i < M; i++) posOfOrig[origIdx(sorted[i])] = i;
    sortedShown = 1;
    kMsg = "选择排序：边按权从小到大排好";
    draw(); wait(0.5);
    int used = 0;
    for (int k = 0; k < M && used < N - 1; k++) {
        int a = find(sorted[k].u), b = find(sorted[k].v);
        hlKEdge = k;
        kMsg = "查 " + S(sorted[k].u) + "-" + S(sorted[k].v) + "(" + S(sorted[k].w) + ")：find = " + S(a) + " 和 " + S(b);
        draw(); wait(0.22);
        if (a == b) {
            kState[k] = 3;
            kMsg = "同根 -> 成环，跳过这条边（红）";
        } else {
            unite(sorted[k].u, sorted[k].v);
            kState[k] = 2;
            kCost += sorted[k].w; used++;
            hlFa = b;
            kMsg = "合并，选中（绿）；总权值 = " + S((int)kCost);
        }
        hlKEdge = -1;
        draw(); wait(0.22);
        hlFa = -1;
    }
    kMsg = "Kruskal 完成：总权值 = " + S((int)kCost) + " = Prim";
    draw(); wait(0.6);
    printf("Prim 总权值 = %lld，Kruskal 总权值 = %lld（相等）\\n", primCost, kCost);
    return 0;
}
`,
  },
  '哈希表：增删查与遍历（画图版）': {
    group: 'GoC 可视化·图与哈希',
    stdin: '',
    code: `// 哈希表：增删查与遍历。用原版同一组键值、同一个 unordered_map<int,string>，
// 把真实的桶数组画出来：桶号 = hash(key) % 桶数，冲突的键挂同一条链。
// 操作顺序与原版一致：插 5 项 -> 查 15937 -> hmap[99999] 补空串 -> find(77777) -> 删 2 项 -> 排序遍历。
// 颜色：黄 = 正在定位/比较，绿 = 找到/新插入，红 = 冲突/待删除/未命中，橙 = operator[] 补的空值。
#include <goc.h>
#include <cstdio>
#include <unordered_map>
#include <algorithm>
#include <string>
#include <cstring>
using namespace std;

unordered_map<int, string> hmap;
int hlKey = -1;                // 黄：正在比较的键
int okKey = -1;                // 绿：找到 / 刚插入
int badKey = -1;               // 红：冲突的旧键 / 待删除
int emptyKey = -1;             // 橙：[] 补的空值
size_t hlBucket = (size_t)-1;
int badBucket = 0;
string msg, travel;

// ---------- 局部重绘基础设施：擦槽 + 脏跟踪 ----------
const int MB = 128, MC = 8;
int cBc = 0;
int cCnt[MB], cHead[MB], cCon[MB];
int cKey[MB][MC], cNc[MB][MC];
char cVal[MB][MC][40];
int lBc = -1, lSizeN = -1, lEmpty = 0;
int lCnt[MB], lHead[MB], lCon[MB];
int lKey[MB][MC], lNc[MB][MC];
char lVal[MB][MC][40];
string lmsg, ltravel;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
}
double cellWOf(int bc) { double w = 700.0 / bc - 8; if (w > 58) w = 58; return w; }
double colXOf(int bc, int b) { return -350 + (700.0 / bc) * (b + 0.5); }
double colWOf(int bc) { double g = 700.0 / bc, w = cellWOf(bc) + 6; if (w > g - 1) w = g - 1; return w; }
double colBot(int cnt) { return 134 - 56 * (cnt > 0 ? cnt - 1 : 0); }

void resetCols() {
    for (int b = 0; b < MB; b++) {
        lCnt[b] = 0; lHead[b] = -1; lCon[b] = -1;
        for (int j = 0; j < MC; j++) { lKey[b][j] = -1; lNc[b][j] = -1; lVal[b][j][0] = 0; }
    }
}
void initLast() {
    resetCols();
    lBc = -1; lSizeN = -1; lEmpty = 0; lmsg = ""; ltravel = "";
}
// 静态背景只画一次，全部在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("哈希表：增删查与遍历", 0, 26);
    pen.pu().moveTo(-350, -140).pd().c(0).textL("遍历（键排序后）：", 0, 17);
    pen.pu().moveTo(-350, -345).pd().c(8).textL("黄 = 定位/比较  绿 = 找到/新插入  红 = 冲突/删除/未命中  橙 = [] 补的空值", 8, 14);
}

void compute() {
    cBc = (int)hmap.bucket_count();
    if (cBc > MB) cBc = MB;
    for (int b = 0; b < cBc; b++) {
        cHead[b] = 15;
        if ((size_t)b == hlBucket) cHead[b] = badBucket ? 1 : 5;
        cCon[b] = hmap.bucket_size(b) > 0 ? 1 : 0;
        int j = 0;
        for (auto it = hmap.begin(b); it != hmap.end(b) && j < MC; ++it, ++j) {
            int key = it->first, nc = 2;
            if (key == hlKey) nc = 5;
            if (key == okKey) nc = 3;
            if (key == badKey) nc = 1;
            if (key == emptyKey) nc = 14;
            cKey[b][j] = key; cNc[b][j] = nc;
            string val = it->second.empty() ? string("(空串)") : it->second;
            snprintf(cVal[b][j], 40, "%s", val.c_str());
        }
        cCnt[b] = j;
    }
}

// 整列重画：桶头 + 编号 + 连接线 + 链上所有格子
void paintCol(int b) {
    double cw = cellWOf(cBc), x = colXOf(cBc, b);
    int ks = cw > 50 ? 13 : 11;
    pen.setAngle(0);
    pen.pu().moveTo(x, 210).pd().c(cHead[b]).rr(cw, 30);
    pen.pu().moveTo(x, 210).pd().c(8).size(1).r(cw, 30);
    pen.pu().moveTo(x, 233).pd().c(0).text(b, 0, 12);
    if (cCon[b]) pen.pu().moveTo(x, 195).pd().c(8).size(1.5).lineTo(x, 183);
    for (int j = 0; j < cCnt[b]; j++) {
        double y = 160 - j * 56;
        int nc = cNc[b][j], tc = (nc == 2 || nc == 1) ? 15 : 0;
        pen.pu().moveTo(x, y).pd().c(nc).rr(cw, 44);
        pen.pu().moveTo(x, y + 10).pd().c(tc).text(cKey[b][j], tc, ks);
        pen.pu().moveTo(x, y - 11).pd().c(tc).text(string(cVal[b][j]), tc, ks);
    }
}

void draw() {
    compute();
    int sizeN = (int)hmap.size();
    int cEmpty = (cBc == 0) ? 1 : 0;
    int dGeo[MB], dCol[MB];
    for (int b = 0; b < cBc; b++) {
        int g = 0, c = 0;
        if (cCnt[b] != lCnt[b] || cCon[b] != lCon[b]) g = 1;
        if (cHead[b] != lHead[b]) c = 1;
        for (int j = 0; j < cCnt[b]; j++) {
            if (cKey[b][j] != lKey[b][j] || strcmp(cVal[b][j], lVal[b][j]) != 0) g = 1;
            if (cNc[b][j] != lNc[b][j]) c = 1;
        }
        dGeo[b] = g; dCol[b] = (g || c) ? 1 : 0;
    }
    // ---------- 第一遍：只擦，不画 ----------
    if (cBc != lBc) {                       // 桶数变了（rehash）：整片擦掉旧几何
        if (lBc > 0) {
            int mx = 0;
            for (int b = 0; b < lBc; b++) if (lCnt[b] > mx) mx = lCnt[b];
            double bot = colBot(mx);
            eraseBox(0, (241 + bot) / 2, 706, 241 - bot);
        }
        resetCols();
        lBc = cBc;
        for (int b = 0; b < cBc; b++) { dGeo[b] = 1; dCol[b] = 1; }
    }
    if (cEmpty != lEmpty) eraseBox(0, 160, 320, 32);
    for (int b = 0; b < cBc; b++) {
        if (dGeo[b]) {                      // 只变颜色的实心格不擦，原位盖旧
            int mx = cCnt[b] > lCnt[b] ? cCnt[b] : lCnt[b];
            double bot = colBot(mx);
            eraseBox(colXOf(cBc, b), (241 + bot) / 2, colWOf(cBc), 241 - bot);
        }
    }
    if (sizeN != lSizeN) eraseBox(300, 330, 120, 26);
    if (msg != lmsg) eraseBox(-60, 295, 600, 28);
    if (travel != ltravel) eraseBox(-60, -180, 600, 26);
    // ---------- 第二遍：按原版顺序画 ----------
    pen.setAngle(0);
    if (sizeN != lSizeN) pen.pu().moveTo(250, 330).pd().c(0).textL("size = " + to_string(sizeN), 0, 18);
    if (msg != lmsg) pen.pu().moveTo(-350, 295).pd().c(1).textL(msg, 1, 18);
    if (cEmpty) {
        if (cEmpty != lEmpty) pen.pu().moveTo(0, 160).pd().c(8).text("（空表，还没有桶）", 8, 18);
    } else {
        for (int b = 0; b < cBc; b++) if (dCol[b]) paintCol(b);
    }
    if (travel != ltravel) pen.pu().moveTo(-350, -180).pd().c(10).textL(travel, 10, 17);
    // ---------- 存状态 ----------
    for (int b = 0; b < cBc; b++) {
        lCnt[b] = cCnt[b]; lHead[b] = cHead[b]; lCon[b] = cCon[b];
        for (int j = 0; j < cCnt[b]; j++) {
            lKey[b][j] = cKey[b][j]; lNc[b][j] = cNc[b][j];
            snprintf(lVal[b][j], 40, "%s", cVal[b][j]);
        }
    }
    lSizeN = sizeN; lEmpty = cEmpty; lmsg = msg; ltravel = travel;
}

int main() {
    pen.speed(10);
    initLast();
    drawStatic();
    msg = "初始化空表：unordered_map<int, string>";
    draw(); wait(0.35);
    // 插入：与原版同序同数据
    int keys[5] = {12836, 15937, 16750, 13276, 10583};
    const char* vals[5] = {"小哈", "小啰", "小算", "小法", "小鸭"};
    for (int i = 0; i < 5; i++) {
        int key = keys[i];
        if (hmap.bucket_count() == 0) {    // 第一个键：先插入让桶数组建起来
            hmap[key] = vals[i];
            okKey = key; hlBucket = hmap.bucket(key);
            msg = "插入 " + to_string(key) + " -> " + vals[i] + "：建桶，落桶 " + to_string(hlBucket);
            draw(); wait(0.3);
            okKey = -1; hlBucket = (size_t)-1;
            continue;
        }
        size_t b = hmap.bucket(key);
        hlBucket = b;
        int collision = hmap.bucket_size(b) > 0;
        if (collision) badKey = hmap.begin(b)->first;
        msg = "插入 " + to_string(key) + " -> " + vals[i] + "：定位桶 " + to_string(b);
        if (collision) msg += "（已有键，冲突！）";
        draw(); wait(0.22);
        hmap[key] = vals[i];
        badKey = -1; okKey = key; hlBucket = (size_t)-1;
        msg = collision ? "冲突：挂进桶 " + to_string(b) + " 的链里" : "放入桶 " + to_string(b);
        draw(); wait(0.18);
        okKey = -1;
    }
    // 查询 15937：定位桶，沿链比较
    hlBucket = hmap.bucket(15937);
    msg = "查 15937：先定位桶 " + to_string(hlBucket);
    draw(); wait(0.2);
    for (auto it = hmap.begin(hlBucket); it != hmap.end(hlBucket); ++it) {
        hlKey = it->first;
        msg = "比较键 " + to_string(it->first) + (it->first == 15937 ? "：命中！" : "：不是，沿链往下");
        draw(); wait(0.2);
        if (it->first == 15937) {
            okKey = 15937; hlKey = -1;
            msg = "查 15937 -> " + it->second;
            draw(); wait(0.22);
            break;
        }
    }
    okKey = -1; hlKey = -1; hlBucket = (size_t)-1;
    // hmap[99999]：查不到会顺手插一个空值
    hlBucket = hmap.bucket(99999);
    msg = "hmap[99999]：定位桶 " + to_string(hlBucket) + "，沿链找";
    draw(); wait(0.22);
    for (auto it = hmap.begin(hlBucket); it != hmap.end(hlBucket); ++it) {
        hlKey = it->first;
        msg = "比较 " + to_string(it->first) + " != 99999";
        draw(); wait(0.18);
    }
    hlKey = -1;
    hmap[99999] = "";
    emptyKey = 99999;
    msg = "查不到：operator[] 顺手插一个空值（橙）";
    draw(); wait(0.3);
    emptyKey = -1; hlBucket = (size_t)-1;
    // find(77777)：只查不插
    hlBucket = hmap.bucket(77777);
    msg = "find(77777)：定位桶 " + to_string(hlBucket);
    draw(); wait(0.22);
    badBucket = 1;
    msg = "链上没有 -> 没找到，不插入（size 不变）";
    draw(); wait(0.25);
    badBucket = 0; hlBucket = (size_t)-1;
    // 删除 10583 和 99999
    int delKeys[2] = {10583, 99999};
    for (int i = 0; i < 2; i++) {
        int key = delKeys[i];
        hlBucket = hmap.bucket(key); badKey = key;
        msg = "删除 " + to_string(key) + "：定位桶，标红摘除";
        draw(); wait(0.22);
        hmap.erase(key);
        badKey = -1; hlBucket = (size_t)-1;
        msg = "删掉 " + to_string(key) + "，size = " + to_string(hmap.size());
        draw(); wait(0.18);
    }
    // 遍历：收集键排序后逐个访问（与原版一致）
    int ks[16]; int kc = 0;
    for (auto kv : hmap) ks[kc++] = kv.first;
    sort(ks, ks + kc);
    travel = "";
    msg = "遍历：收集键排序后逐个访问（绿）";
    draw(); wait(0.25);
    for (int i = 0; i < kc; i++) {
        okKey = ks[i];
        hlBucket = hmap.bucket(ks[i]);
        travel += to_string(ks[i]) + "->" + hmap[ks[i]] + "  ";
        msg = "遍历 " + to_string(ks[i]) + " -> " + hmap[ks[i]];
        draw(); wait(0.22);
    }
    okKey = -1; hlBucket = (size_t)-1;
    msg = "完成：表里剩 " + to_string(hmap.size()) + " 项";
    draw(); wait(0.45);
    printf("插入5项；查15937=小啰；[]补99999空串；find77777未命中；删2项剩4项\\n");
    return 0;
}
`,
  },
  '内置哈希函数 hash()（画图版）': {
    group: 'GoC 可视化·图与哈希',
    stdin: '',
    code: `// 内置哈希函数 hash()：四个键（int 3 / bool true / double 3.14159 / string Hello）
// 与原版一致，逐个送进 std::hash 得到 size_t，再模桶数 7 落桶，观察分布。
// 颜色：黄 = 正在处理的键，绿 = 已处理，白 = 等待；落桶瞬间桶标黄， token 绿。
#include <goc.h>
#include <cstdio>
#include <functional>
#include <string>
using namespace std;

const int B = 7;
int bucketCnt[B];              // 每个桶落了几个键
int tokenKey[B][4];            // 桶里的键序号
int done[4];
int cur = -1, phase = 0;
size_t hval[4];
int bidx[4];
string msg;

const char* keyType[4] = {"int", "bool", "double", "string"};
const char* keyVal[4] = {"3", "true", "3.14159", "Hello"};
const char* tokenTag[4] = {"3", "T", "3.14", "H"};

void arrow(double x1, double y1, double x2, double y2, int col, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    double ux = dx / L, uy = dy / L;
    pen.pu().moveTo(x1, y1).pd().c(col).size(w).setAngle(atan2_deg(dx, dy)).fd(L);
    double bx = x2 - ux * 12, by = y2 - uy * 12;
    pen.polXY();
    pen.polXY(x2, y2);
    pen.polXY(bx - uy * 5, by + ux * 5);
    pen.polXY(bx + uy * 5, by - ux * 5);
    pen.c(col).pol(1, col);
}

// ---------- 局部重绘基础设施：擦除矩形登记 + 命中补画 ----------
const int MAXR = 3000;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;
void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 12, 12);
    }
}
int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}
int segHitEr(double x1, double y1, double x2, double y2, double mg) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + mg && fabs(y - erY[j]) <= erH[j] / 2 + mg) return 1;
    }
    return 0;
}

int lFill[4], lBFill[B], lBCnt[B], lBKey[B][4];
int lIn = 0, lInner = 0, lOut = 0, lVal = 0, lMod = 0, lCur = -1, lBox = 0;
string lmsg;

void initLast() {
    for (int i = 0; i < 4; i++) lFill[i] = -1;
    for (int b = 0; b < B; b++) {
        lBFill[b] = -1; lBCnt[b] = -1;
        for (int j = 0; j < 4; j++) lBKey[b][j] = -1;
    }
    lIn = lInner = lOut = lVal = lMod = 0; lCur = -1; lBox = 0; lmsg = "";
}
// 静态背景只画一次，全部在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("内置哈希函数 hash()", 0, 26);
    pen.pu().moveTo(60, 165).pd().c(0).textL("size_t 哈希值", 0, 15);
    pen.pu().moveTo(-350, -95).pd().c(0).textL("桶（共 7 个）", 0, 15);
    pen.pu().moveTo(-350, -345).pd().c(8).textL("哈希值只配当索引用；判等要比内容，不是比哈希值", 8, 14);
}

void inGeom(int c, double* g) {
    g[0] = -225; g[1] = 240 - c * 80; g[2] = -122; g[3] = 120;
    double dx = g[2] - g[0], dy = g[3] - g[1], L = sqrt(dx * dx + dy * dy);
    g[4] = dx / L; g[5] = dy / L;
}
void eraseArrow(double x1, double y1, double x2, double y2, double ux, double uy) {
    eraseSeg(x1, y1, x2, y2);
    eraseBox(x2 - ux * 6, y2 - uy * 6, 30, 30);
}
void paintCard(int i) {
    double y = 240 - i * 80;
    int fill = done[i] ? 3 : (i == cur ? 5 : 15);
    pen.setAngle(0);
    pen.pu().moveTo(-300, y).pd().c(fill).rr(150, 56);
    pen.pu().moveTo(-300, y).pd().c(8).size(1.5).r(150, 56);
    pen.pu().moveTo(-300, y + 14).pd().c(0).text(keyType[i], 0, 13);
    pen.pu().moveTo(-300, y - 12).pd().c(0).text(keyVal[i], 0, 16);
}
void paintBox() {
    pen.setAngle(0);
    pen.pu().moveTo(-60, 120).pd().c(11).size(3).r(120, 70);
    pen.pu().moveTo(-60, 138).pd().c(11).text("hash()", 11, 20);
}
void paintBucket(int i) {
    double x = -270 + i * 90;
    int fill = (cur >= 0 && phase >= 2 && i == bidx[cur]) ? 5 : 15;
    pen.setAngle(0);
    pen.pu().moveTo(x, -160).pd().c(fill).rr(72, 90);
    pen.pu().moveTo(x, -160).pd().c(8).size(1.5).r(72, 90);
    pen.pu().moveTo(x, -222).pd().c(0).text(i, 0, 14);
    for (int j = 0; j < bucketCnt[i]; j++) {
        double ty = -185 + j * 22;
        pen.pu().moveTo(x, ty).pd().c(3).oo(11);
        pen.pu().moveTo(x, ty).pd().c(0).text(tokenTag[tokenKey[i][j]], 0, 9);
    }
}

void draw() {
    erN = 0;
    int cFill[4], cBFill[B];
    for (int i = 0; i < 4; i++) cFill[i] = done[i] ? 3 : (i == cur ? 5 : 15);
    for (int b = 0; b < B; b++) cBFill[b] = (cur >= 0 && phase >= 2 && b == bidx[cur]) ? 5 : 15;
    int cIn = (cur >= 0) ? 1 : 0;
    int cInner = (cur >= 0 && phase >= 1) ? 1 : 0;
    int cOut = cInner, cVal = cInner;
    int cMod = (cur >= 0 && phase >= 2) ? 1 : 0;

    int dCard[4], dGeoB[B], dColB[B];
    for (int i = 0; i < 4; i++) dCard[i] = (cFill[i] != lFill[i]) ? 1 : 0;
    for (int b = 0; b < B; b++) {
        int g = (bucketCnt[b] != lBCnt[b]) ? 1 : 0;
        for (int j = 0; j < bucketCnt[b]; j++) if (tokenKey[b][j] != lBKey[b][j]) g = 1;
        dGeoB[b] = g; dColB[b] = (cBFill[b] != lBFill[b]) ? 1 : 0;
    }
    int dIn = (cIn != lIn || (cIn && cur != lCur)) ? 1 : 0;
    int dInner = (cInner != lInner || (cInner && cur != lCur)) ? 1 : 0;
    int dOut = (cOut != lOut) ? 1 : 0;
    int dVal = dInner;
    int dMod = (cMod != lMod || (cMod && cur != lCur)) ? 1 : 0;
    int dMsg = (msg != lmsg) ? 1 : 0;

    double og[6], ng[6];
    if (lIn) inGeom(lCur, og);
    if (cIn) inGeom(cur, ng);
    // ---------- 第一遍：只擦，不画 ----------
    if (dIn && lIn) eraseArrow(og[0], og[1], og[2], og[3], og[4], og[5]);
    if (dInner && lInner) eraseBox(-60, 108, 200, 26);
    if (dOut && lOut) { eraseSeg(2, 120, 55, 120); eraseBox(49, 120, 30, 30); }
    if (dVal && lVal) eraseBox(160, 135, 220, 26);
    if (dMod && lMod) eraseBox(110, 100, 120, 26);
    for (int b = 0; b < B; b++) if (dGeoB[b]) eraseBox(-270 + b * 90, -168.5, 78, 123);
    if (dMsg) eraseBox(-100, -280, 520, 28);
    // ---------- 命中补画标记：擦到谁就补谁，补画不再擦 ----------
    int pCard[4], pBuck[B];
    for (int i = 0; i < 4; i++) pCard[i] = dCard[i] || rectHitEr(-300, 240 - i * 80, 156, 62);
    int pBox = (!lBox) || rectHitEr(-60, 120, 126, 76);
    int pIn = cIn && (dIn || segHitEr(ng[0], ng[1], ng[2], ng[3], 8)
        || rectHitEr(ng[2] - ng[4] * 6, ng[3] - ng[5] * 6, 30, 30));
    int pInner = cInner && (dInner || rectHitEr(-60, 108, 200, 26));
    int pOut = cOut && (dOut || segHitEr(2, 120, 55, 120, 8) || rectHitEr(49, 120, 30, 30));
    int pVal = cVal && (dVal || rectHitEr(160, 135, 220, 26));
    int pMod = cMod && (dMod || rectHitEr(110, 100, 120, 26));
    for (int b = 0; b < B; b++)
        pBuck[b] = dGeoB[b] || dColB[b] || rectHitEr(-270 + b * 90, -168.5, 78, 123);
    int pMsg = dMsg || rectHitEr(-100, -280, 520, 28);
    // ---------- 第二遍：按原版顺序画 ----------
    for (int i = 0; i < 4; i++) if (pCard[i]) paintCard(i);
    if (pBox) paintBox();
    if (pIn) arrow(ng[0], ng[1], ng[2], ng[3], 14, 2.5);
    if (pInner) {
        pen.setAngle(0);
        pen.pu().moveTo(-60, 108).pd().c(0).text(to_string((unsigned long long)hval[cur]), 0, 15);
    }
    if (pOut) arrow(2, 120, 55, 120, 14, 2.5);
    if (pVal) {
        pen.setAngle(0);
        pen.pu().moveTo(60, 135).pd().c(10).textL(to_string((unsigned long long)hval[cur]), 10, 18);
    }
    if (pMod) {
        pen.setAngle(0);
        pen.pu().moveTo(60, 100).pd().c(1).textL("% 7 = 桶 " + to_string(bidx[cur]), 1, 18);
    }
    for (int b = 0; b < B; b++) if (pBuck[b]) paintBucket(b);
    if (pMsg) { pen.setAngle(0); pen.pu().moveTo(-350, -280).pd().c(1).textL(msg, 1, 18); }
    // ---------- 存状态 ----------
    for (int i = 0; i < 4; i++) lFill[i] = cFill[i];
    for (int b = 0; b < B; b++) {
        lBFill[b] = cBFill[b]; lBCnt[b] = bucketCnt[b];
        for (int j = 0; j < bucketCnt[b]; j++) lBKey[b][j] = tokenKey[b][j];
    }
    lIn = cIn; lInner = cInner; lOut = cOut; lVal = cVal; lMod = cMod;
    lCur = cur; lBox = 1; lmsg = msg;
}

int main() {
    pen.speed(10);
    // 与原版一致的四个键
    int num = 3; hval[0] = hash<int>()(num);
    bool bol = true; hval[1] = hash<bool>()(bol);
    double dec = 3.14159; hval[2] = hash<double>()(dec);
    string str = "Hello"; hval[3] = hash<string>()(str);
    for (int i = 0; i < 4; i++) { bidx[i] = (int)(hval[i] % B); done[i] = 0; }
    for (int i = 0; i < B; i++) bucketCnt[i] = 0;
    initLast();
    drawStatic();
    msg = "四个键排队过 hash()：int / bool / double / string";
    draw(); wait(0.4);
    for (int i = 0; i < 4; i++) {
        cur = i; phase = 0;
        msg = "把键 " + string(keyType[i]) + " " + string(keyVal[i]) + " 送入 hash()";
        draw(); wait(0.3);
        phase = 1;
        msg = "得到 size_t 哈希值 " + to_string((unsigned long long)hval[i]);
        draw(); wait(0.4);
        phase = 2;
        tokenKey[bidx[i]][bucketCnt[bidx[i]]] = i;
        bucketCnt[bidx[i]]++;
        msg = "% 7 = " + to_string(bidx[i]) + "，落桶；分布见下方";
        draw(); wait(0.4);
        done[i] = 1;
    }
    cur = -1; phase = 0;
    msg = "完成：哈希值散列成桶下标，分布可能不均（冲突）";
    draw(); wait(0.6);
    printf("hash: 3->%llu, true->%llu, 3.14159->%llu, Hello->%llu（模7落桶）\\n",
        (unsigned long long)hval[0], (unsigned long long)hval[1],
        (unsigned long long)hval[2], (unsigned long long)hval[3]);
    return 0;
}
`,
  },
  'KMP：next 表与匹配': {
    group: 'GoC 可视化·查找与字符串',
    stdin: '',
    code: `// KMP 的可视化版（局部重绘）：标题/串说明/结论这些静态背景只画一次，
// 文本格、模式格、next 表格、回跳箭头和状态行各自一个槽位，脏跟踪，
// 每帧只擦掉「颜色或内容变了」的那几个槽再重画，不整屏 cls。
// 失配时 j 不回读文本，只沿 next 表往左退，那一步画成一根往左的箭头；
// 匹配成功的那一段文本标成绿色。
#include <goc.h>
#include <cstdio>
#include <cstring>

const char* S = "abababcaabababcab";
const char* P = "ababc";
const int N = 17, M = 5;
int nxt[64];

// 画图用的全局状态
int g_shown = 0;      // 已经画出来的文本字符数
int g_phase = 0;      // 0=画文本 1=算 next 表 2=匹配
int g_i = 0, g_j = 0; // 当前下标
int g_jf = -1, g_jt = -1;   // 回跳箭头：旧 j -> 新 j
int g_mf = -1, g_mt = -1;   // 已经匹配上的那一段
int g_nextN = 1;      // next 表已经算出几项

// ---- 局部重绘的脏跟踪：-1 / -2 表示这个槽还没画过 ----
int lastTCol[24], lastPCol[8], lastNSt[8];
int lastJF = -2, lastJT = -2;
char lastJump[128] = "", lastS1[128] = "", lastS2[128] = "";

double TX(int i) { return -335.0 + 40.0 * i; }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

// 一根带箭头的线段（箭头在 (x2,y2) 这一头）
void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    seg(x1, y1, x2, y2, w);
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    double ux = dx / L, uy = dy / L;
    double c = 0.8660254, s = 0.5, a = 13.0;
    pen.c(col);
    seg(x2, y2, x2 + (-ux * c + uy * s) * a, y2 + (-ux * s - uy * c) * a, w);
    seg(x2, y2, x2 + (-ux * c - uy * s) * a, y2 + (ux * s - uy * c) * a, w);
}

void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

// 一个格子：不透明实心，col 决定填充色（rr 以笔尖为中心）
void cell(double x, double y, double w, double h, int col) {
    pen.pu().moveTo(x, y).pd().c(col).size(2).rr(w, h, col).r(w, h, col);
}

// 静态背景只画一次：标题、串说明、next 表标签、三行结论，全在动态槽位之外
void staticBg() {
    pen.setAngle(0);
    txtL(-370, 330, "KMP：next 表与匹配", 0, 26);
    txtL(-370, 300, "文本 s = abababcaabababcab", 8, 18);
    txtL(-370, 150, "模式 p = ababc", 8, 18);
    txtL(-370, 20, "next 表", 8, 18);
    txtL(-370, -110, "next 表 = 0 0 1 2 0（next[i] 是 p[0..i] 最长的相等前后缀）", 0, 18);
    txtL(-370, -150, "KMP 命中位置：2 10（j 只往左退，从不回读文本）", 0, 18);
    txtL(-370, -190, "和朴素匹配（每个位置重比一遍）结果完全一致。", 8, 18);
}

// 文本串的一格：格子 + 字符 + 下面的下标标签一起擦一起画。
// 槽距 40，擦 40 宽（±20）不碰邻居（邻居格子边在 ±23）；y 190..278 不碰 y=300 的说明
void textCell(int i, int col) {
    if (col == lastTCol[i]) return;
    pen.setAngle(0);                                       // 不 cls 了，角度自己归零
    pen.pu().moveTo(TX(i), 234).pd().clsRec(40, 88);
    cell(TX(i), 250, 34, 40, col);
    char b[2];
    b[0] = S[i]; b[1] = 0;
    txt(TX(i), 250, b, 0, 20);
    char nb[8];
    snprintf(nb, sizeof nb, "%d", i);
    txt(TX(i), 200, nb, 8, 13);
    lastTCol[i] = col;
}

// 模式串的一格：擦 40×48（y 86..134），上面不碰 y=150 的静态标签
void patCell(int i, int col) {
    if (col == lastPCol[i]) return;
    pen.setAngle(0);
    pen.pu().moveTo(TX(i), 110).pd().clsRec(40, 48);
    cell(TX(i), 110, 34, 40, col);
    char b[2];
    b[0] = P[i]; b[1] = 0;
    txt(TX(i), 110, b, 0, 20);
    lastPCol[i] = col;
}

// next 表的一格：描边框（不是实心）+ 数值 + 下标，换色必须先擦旧槽
void nextCell(int i, int col, int shown) {
    int st = col * 2 + shown;
    if (st == lastNSt[i]) return;
    pen.setAngle(0);
    pen.pu().moveTo(TX(i), -34).pd().clsRec(40, 68);       // y -68..0：格子 + 下标标签
    pen.pu().moveTo(TX(i), -20).pd().c(col).size(2).r(34, 36, col);
    if (shown) {
        char nb[8];
        snprintf(nb, sizeof nb, "%d", nxt[i]);
        txt(TX(i), -20, nb, 0, 18);
    }
    char ib[8];
    snprintf(ib, sizeof ib, "%d", i);
    txt(TX(i), -55, ib, 8, 13);
    lastNSt[i] = st;
}

// 回跳箭头：先擦掉上一根箭头自己的走廊（y 45..75，不碰模式格和 next 格）
void jumpArrow() {
    if (g_jf == lastJF && g_jt == lastJT) return;
    pen.setAngle(0);
    if (lastJF >= 0 && lastJT >= 0) {
        double cx = (TX(lastJF) + TX(lastJT)) / 2;
        double w = fabs(TX(lastJF) - TX(lastJT)) + 34;
        pen.pu().moveTo(cx, 60).pd().clsRec(w, 30);
    }
    if (g_jf >= 0 && g_jt >= 0) arrow(TX(g_jf), 60, TX(g_jt), 60, 3, 1);
    lastJF = g_jf; lastJT = g_jt;
}

// 箭头旁边那句失配说明：x 38..382 的独立槽，和箭头（x <= -158）不重叠
void jumpMsg() {
    char b[128];
    if (g_jf >= 0 && g_jt >= 0) snprintf(b, sizeof b, "失配：j = next[j-1] = %d", g_jt);
    else b[0] = 0;
    if (strcmp(b, lastJump) == 0) return;
    pen.setAngle(0);
    pen.pu().moveTo(210, 60).pd().clsRec(344, 30);
    if (b[0]) txtL(40, 60, b, 1, 18);
    strcpy(lastJump, b);
}

// 实时状态行：放在模式格右边那片空白（x >= 40），不压到文本串格子
void statLine(double y, const char* s, int col, int size, char* last) {
    if (strcmp(s, last) == 0) return;
    pen.setAngle(0);
    pen.pu().moveTo(210, y).pd().clsRec(344, 32);
    if (s[0]) txtL(40, y, s, col, size);
    strcpy(last, s);
}

// 每帧只刷新「状态变了」的槽位
void drawKmp() {
    // 文本串（上半屏）：一个字符一个格子
    for (int i = 0; i < g_shown; i++) {
        int col = 15;
        if (g_mf >= 0 && i >= g_mf && i <= g_mt) col = 3;
        if (g_phase == 2 && i == g_i) col = 5;
        textCell(i, col);
    }

    // 模式串
    for (int i = 0; i < M; i++) {
        int col = 15;
        if (g_phase == 1) {
            if (i == g_i) col = 5;
            else if (i == g_j) col = 2;
        }
        if (g_phase == 2) {
            if (i < g_j) col = 3;
            else if (i == g_j) col = 5;
        }
        patCell(i, col);
    }

    // 回跳箭头：j 从旧位置退到 next[j-1]
    jumpArrow();
    jumpMsg();

    // next 表（下半屏）
    for (int i = 0; i < M; i++) {
        int shown = (i < g_nextN) ? 1 : 0;
        nextCell(i, shown ? 2 : 8, shown);
    }

    // 实时状态
    char b2[128];
    snprintf(b2, sizeof b2, "当前 i=%d  j=%d", g_i, g_j);
    statLine(150, b2, 0, 20, lastS1);
    if (g_phase == 2) {
        char b3[128];
        snprintf(b3, sizeof b3, "s[%d]='%c'  p[%d]='%c'", g_i, S[g_i], g_j, P[g_j]);
        statLine(112, b3, 8, 18, lastS2);
    } else {
        statLine(112, "", 8, 18, lastS2);
    }
}

int main() {
    pen.speed(10);
    for (int i = 0; i < 24; i++) lastTCol[i] = -1;
    for (int i = 0; i < 8; i++) { lastPCol[i] = -1; lastNSt[i] = -1; }
    staticBg();

    // 阶段 0：文本串一个字符一个字符画出来
    for (g_shown = 1; g_shown <= N; g_shown++) {
        drawKmp();
        wait(0.04);
    }
    g_shown = N;
    drawKmp();
    wait(0.25);

    // 阶段 1：算 next 表（沿用原来的 prefixFunction 写法）
    g_phase = 1;
    nxt[0] = 0;
    g_nextN = 1;
    drawKmp();
    wait(0.25);
    for (int i = 1, j = 0; i < M; i++) {
        g_i = i; g_j = j; g_jf = -1;
        drawKmp();
        wait(0.12);
        while (j > 0 && P[i] != P[j]) {
            int nj = nxt[j - 1];
            g_jf = j; g_jt = nj;
            drawKmp();
            wait(0.13);
            j = nj; g_j = j; g_jf = -1;
        }
        if (P[i] == P[j]) ++j;
        nxt[i] = j;
        g_nextN = i + 1;
        g_j = j;
        drawKmp();
        wait(0.12);
    }

    // 阶段 2：KMP 匹配
    g_phase = 2;
    g_i = 0; g_j = 0; g_jf = -1;
    drawKmp();
    wait(0.25);
    int j = 0;
    for (int i = 0; i < N; i++) {
        g_i = i; g_j = j;
        drawKmp();
        wait(0.05);
        while (j > 0 && S[i] != P[j]) {
            int nj = nxt[j - 1];
            g_jf = j; g_jt = nj;
            drawKmp();
            wait(0.13);
            j = nj; g_j = j; g_jf = -1;
        }
        if (S[i] == P[j]) ++j;
        g_j = j;
        drawKmp();
        wait(0.05);
        if (j == M) {
            g_mf = i - M + 1; g_mt = i;
            drawKmp();
            wait(0.18);
            j = nxt[j - 1];
            g_j = j;
            drawKmp();
            wait(0.05);
        }
    }

    drawKmp();
    printf("KMP 命中位置：2 10；next 表：0 0 1 2 0（j 只往左退，从不回读文本）。\\n");
    return 0;
}
`,
  },
  '散列表：除留余数 + 拉链法（画图版）': {
    group: 'GoC 可视化·查找与字符串',
    stdin: '',
    code: `// 散列表（除留余数 + 拉链法）的可视化版（局部重绘）：标题/说明/图例/结论只画一次，
// 桶和链上节点各自一个槽位，脏跟踪，每帧只擦重画变了的那几个，不整屏 cls。
// 左边一列是 7 个桶，每个桶右边挂着同桶冲突的链表节点（箭头就是 next 指针）。
// 黄 = 正在算哈希 / 正在比较的节点，绿 = 刚挂到链尾的新节点或查找命中，
// 粉红 = 沿链走到尾也没找到（查无此词）。键值与原版完全一致。
#include <goc.h>
#include <cstdio>
#include <cstring>
#include <string>

const int B = 7;                              // 桶数
const int MAXK = 64;                          // 最多 64 个键
const int MAXLEN = 16;                        // 键长上限

struct Node {
    char key[MAXLEN];                         // 键
    int val;                                  // 值
    int next;                                 // 同桶里的下一个节点下标，-1 是链尾
};

Node nodes[MAXK];
int head[B];                                  // 每个桶的链表头
int cnt = 0;

// ---- 画图用的全局状态 ----
int g_phase = 0;                              // 0 空表 1 插入 2 查找 3 结束
char g_key[MAXLEN] = "";
unsigned g_hash = 0;                          // 多项式滚动哈希（32 位自然溢出）
int g_bucket = -1;                            // 目标桶
int g_cmp = -1;                               // 正在比较的节点号
int g_new = -1;                               // 刚挂上的节点号
int g_hit = -1;                               // 命中的节点号
int g_miss = 0;
char g_msg[96] = "";
char g_msg2[96] = "";
char g_res[160] = "";

// ---- 局部重绘的脏跟踪 ----
int lastBFill[B];                         // 桶的填充色（不透明实心，只换色就原位盖旧）
int lastNFill[B][4], lastNBd[B][4];       // 链上节点的填充色 / 边框色
char lastNTxt[B][4][48];                  // 节点里的 "key : val"
int lastNN[B];                            // 这一行已经画出来的节点数
int lastEmpty[B];                         // "空链" 标签在不在
char lastPh[192] = "", lastKey[192] = "", lastHash[192] = "", lastBkt[192] = "";
char lastMsg[192] = "", lastMsg2[192] = "", lastRes[192] = "";

double BY(int i) { return 236.0 - 72.0 * i; }        // 第 i 个桶的纵坐标
double NX(int j) { return -168.0 + 158.0 * j; }      // 链上第 j 个节点的横坐标

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

// 带箭头的线段（箭头在 (x2,y2) 这一头），用来画 next 指针
void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    double ux = dx / L, uy = dy / L, a = 9.0;
    seg(x2, y2, x2 + (-ux * 0.866 + uy * 0.5) * a, y2 + (-ux * 0.5 - uy * 0.866) * a, w);
    seg(x2, y2, x2 + (-ux * 0.866 - uy * 0.5) * a, y2 + (ux * 0.5 - uy * 0.866) * a, w);
}

void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

// 静态背景只画一次：标题、说明、桶标签、右侧图例、底部两行结论，全在动态槽位之外
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("散列表：除留余数 + 拉链法", 0, 26);
    txtL(-350, 296, "h = h*131 + 字符，再 mod 7；冲突就挂到同一条链的链尾", 8, 16);
    txt(-300, 272, "桶", 8, 14);
    txtL(110, 250, "当前操作", 8, 15);
    txtL(110, -20, "黄 = 正在处理", 7, 15);
    txtL(110, -48, "绿 = 新节点 / 命中", 3, 15);
    txtL(110, -76, "红 = 查无此词", 1, 15);
    txtL(-350, -262, "7 个键 mod 7 只落在 4 个桶：0(egg,fig) 2(durian) 4(banana,cherry) 6(apple)", 0, 15);
    txtL(-350, -292, "查找只走自己那条链；同键 apple 第二次 put 是覆盖，不是新增节点", 8, 15);
}

// 一个桶：不透明实心 + 固定蓝框 + 固定编号，只有填充色会变 → 原位盖旧，不用擦，
// 这样也不会碰到从桶右边 -268 出发的那根箭头
void bucketCell(int i, int fill) {
    if (fill == lastBFill[i]) return;
    double y = BY(i);
    pen.setAngle(0);
    pen.pu().moveTo(-300, y).pd().c(fill).size(2).rr(60, 46, fill).r(60, 46, 2);
    char b[8];
    snprintf(b, sizeof b, "%d", i);
    txt(-300, y, b, 0, 20);
    lastBFill[i] = fill;
}

// 链上一个节点的槽：进来的那根箭头 + 节点框 + key:val 一起擦一起画。
// 槽左边界 = 箭头尾巴（j=0 时 -268，正好在桶边框外面），右边界 = NX(j)+72；
// 高 54（行距 72），上下不碰邻行，左右不碰邻节点
void nodeSlot(int i, int j, int p) {
    double y = BY(i), x = NX(j);
    double left = (j == 0) ? -268.0 : NX(j - 1) + 72.0;
    double right = x + 72.0;
    int nf = 15, nb = 2;
    if (g_miss && i == g_bucket) { nf = 9; nb = 1; }   // 红：整条链都比过了
    if (p == g_cmp) { nf = 5; nb = 7; }                // 黄：正在比较
    if (p == g_new || p == g_hit) { nf = 3; nb = 10; } // 绿：新节点 / 命中
    char t[48];
    snprintf(t, sizeof t, "%s : %d", nodes[p].key, nodes[p].val);
    if (nf == lastNFill[i][j] && nb == lastNBd[i][j] && strcmp(t, lastNTxt[i][j]) == 0) return;
    pen.setAngle(0);
    pen.pu().moveTo((left + right) / 2, y).pd().clsRec(right - left, 60);
    if (j == 0) arrow(-268, y, x - 72, y, 2, 8);
    else arrow(NX(j - 1) + 72, y, x - 72, y, 2, 8);
    pen.pu().moveTo(x, y).pd().c(nf).size(2).rr(140, 46, nf).r(140, 46, nb);
    txt(x, y, t, 0, 17);
    lastNFill[i][j] = nf; lastNBd[i][j] = nb;
    snprintf(lastNTxt[i][j], sizeof lastNTxt[i][j], "%s", t);
}

// 空链标签：自己一个小槽（x -252..-188），不碰桶；擦除框比字足迹大一圈，
// 保证旧字（含抗锯齿边）一次擦净，上下 40 高也远小于行距 72
void emptyLabel(int i, int on) {
    if (on == lastEmpty[i]) return;
    double y = BY(i);
    pen.setAngle(0);
    pen.pu().moveTo(-220, y - 6).pd().clsRec(64, 40);
    if (on) txtL(-238, y - 8, "空链", 8, 14);
    lastEmpty[i] = on;
}

// 一行 = 一个桶 + 它那条链，只重画这一行里变了的元素。
// 先处理空链标签（擦旧标签），再画节点，避免标签擦除框啃到刚画好的节点左缘
void drawRow(int i) {
    double y = BY(i);
    emptyLabel(i, (head[i] == -1) ? 1 : 0);
    bucketCell(i, (i == g_bucket) ? 5 : 15);
    int j = 0;
    for (int p = head[i]; p != -1; p = nodes[p].next) { nodeSlot(i, j, p); j++; }
    for (int k = j; k < lastNN[i]; k++) {          // 链变短时擦掉多出来的旧槽
        double left = (k == 0) ? -268.0 : NX(k - 1) + 72.0;
        double right = NX(k) + 72.0;
        pen.setAngle(0);
        pen.pu().moveTo((left + right) / 2, y).pd().clsRec(right - left, 60);
        lastNFill[i][k] = -1; lastNBd[i][k] = -1; lastNTxt[i][k][0] = 0;
    }
    lastNN[i] = j;
}

// 右侧状态栏的一行：各自一个固定槽（x 104..376），文字变了才擦掉重写
void panelLine(double cy, double h, double y, const char* s, int col, int size, char* last) {
    if (strcmp(s, last) == 0) return;
    pen.setAngle(0);
    pen.pu().moveTo(240, cy).pd().clsRec(272, h);
    if (s[0]) txtL(110, y, s, col, size);
    snprintf(last, 192, "%s", s);
}

// 一帧：只刷新变了的桶 / 节点 / 状态行
void drawTable() {
    for (int i = 0; i < B; i++) drawRow(i);

    const char* ph = "空表";
    if (g_phase == 1) ph = "插入 put";
    if (g_phase == 2) ph = "查找 get";
    if (g_phase == 3) ph = "结束";
    panelLine(220, 32, 220, ph, 2, 20, lastPh);
    panelLine(184, 32, 184, g_key, 0, 24, lastKey);
    char b[192];
    snprintf(b, sizeof b, "h = %u", g_hash);
    panelLine(148, 28, 148, b, 8, 16, lastHash);
    if (g_bucket >= 0) snprintf(b, sizeof b, "h %% 7 = %d", g_bucket);
    else b[0] = 0;
    panelLine(116, 32, 116, b, 1, 22, lastBkt);
    panelLine(74, 26, 74, g_msg, 0, 16, lastMsg);
    panelLine(44, 26, 44, g_msg2, 0, 16, lastMsg2);

    if (g_phase == 3 && strcmp(g_res, lastRes) != 0) {
        pen.setAngle(0);
        pen.pu().moveTo(-40, -324).pd().clsRec(620, 28);
        txtL(-350, -324, g_res, 3, 18);
        snprintf(lastRes, sizeof lastRes, "%s", g_res);
    }
}

// 多项式滚动哈希，再除留余数（顺手把 h 记下来给画面用）
int idx(const std::string& k) {
    unsigned h = 0;
    for (size_t i = 0; i < k.size(); ++i) h = h * 131u + (unsigned)k[i];
    g_hash = h;
    return (int)(h % (unsigned)B);
}

void put(const std::string& k, int v) {
    g_phase = 1; g_cmp = -1; g_new = -1; g_hit = -1; g_miss = 0;
    snprintf(g_key, sizeof g_key, "%s", k.c_str());
    int b = idx(k);
    g_bucket = b;
    snprintf(g_msg, sizeof g_msg, "算哈希 → 桶 %d", b);
    snprintf(g_msg2, sizeof g_msg2, "沿链找有没有同键");
    drawTable(); wait(0.16);
    for (int i = head[b]; i != -1; i = nodes[i].next) {
        g_cmp = i;
        snprintf(g_msg, sizeof g_msg, "比较 %s", nodes[i].key);
        snprintf(g_msg2, sizeof g_msg2, "同键？");
        drawTable(); wait(0.12);
        if (k == nodes[i].key) {
            nodes[i].val = v;
            g_hit = i; g_cmp = -1;
            snprintf(g_msg, sizeof g_msg, "同键覆盖");
            snprintf(g_msg2, sizeof g_msg2, "val = %d", v);
            drawTable(); wait(0.2);
            return;
        }
    }
    // 没找到：挂到链尾（和原版一个顺序，桶内容才一模一样）
    int last = head[b];
    while (last != -1 && nodes[last].next != -1) last = nodes[last].next;
    int id = cnt++;
    strcpy(nodes[id].key, k.c_str());
    nodes[id].val = v;
    nodes[id].next = -1;
    if (last == -1) head[b] = id; else nodes[last].next = id;
    g_new = id; g_cmp = -1;
    snprintf(g_msg, sizeof g_msg, "没同键 → 挂链尾");
    snprintf(g_msg2, sizeof g_msg2, "新节点 %d", id);
    drawTable(); wait(0.16);
}

int* get(const std::string& k) {
    g_phase = 2; g_cmp = -1; g_new = -1; g_hit = -1; g_miss = 0;
    snprintf(g_key, sizeof g_key, "%s", k.c_str());
    int b = idx(k);
    g_bucket = b;
    snprintf(g_msg, sizeof g_msg, "算哈希 → 桶 %d", b);
    snprintf(g_msg2, sizeof g_msg2, "只走这一条链");
    drawTable(); wait(0.16);
    for (int i = head[b]; i != -1; i = nodes[i].next) {
        g_cmp = i;
        snprintf(g_msg, sizeof g_msg, "比较 %s", nodes[i].key);
        snprintf(g_msg2, sizeof g_msg2, "相等就返回");
        drawTable(); wait(0.14);
        if (k == nodes[i].key) {
            g_hit = i; g_cmp = -1;
            snprintf(g_msg, sizeof g_msg, "命中");
            snprintf(g_msg2, sizeof g_msg2, "val = %d", nodes[i].val);
            drawTable(); wait(0.22);
            return &nodes[i].val;
        }
    }
    g_miss = 1; g_cmp = -1;
    snprintf(g_msg, sizeof g_msg, "走到链尾也没有");
    snprintf(g_msg2, sizeof g_msg2, "查无此词");
    drawTable(); wait(0.25);
    return nullptr;
}

int main() {
    pen.speed(10);
    for (int i = 0; i < B; ++i) {
        head[i] = -1;
        lastBFill[i] = -1; lastNN[i] = 0; lastEmpty[i] = -1;
        for (int j = 0; j < 4; j++) {
            lastNFill[i][j] = -1; lastNBd[i][j] = -1; lastNTxt[i][j][0] = 0;
        }
    }
    cnt = 0;
    staticBg();
    drawTable();
    wait(0.4);
    put("apple", 3);  put("banana", 7); put("cherry", 1);
    put("durian", 9); put("egg", 2);    put("fig", 5);
    put("apple", 4);                      // 同键覆盖
    const char* keys[3] = {"apple", "fig", "grape"};
    int vals[3] = {-1, -1, -1};
    for (int i = 0; i < 3; ++i) {
        int* v = get(keys[i]);
        if (v) vals[i] = *v;
    }
    g_phase = 3; g_bucket = -1; g_cmp = -1; g_hit = -1; g_new = -1; g_miss = 0;
    g_key[0] = 0; g_msg[0] = 0; g_msg2[0] = 0;
    snprintf(g_res, sizeof g_res, "apple -> %d    fig -> %d    grape -> 查无此词", vals[0], vals[1]);
    drawTable();
    wait(0.6);
    printf("拉链法：apple->4 fig->5 grape->查无此词；桶 0/2/4/6 有链，最长链 2。\\n");
    return 0;
}
`,
  },
  '散列表：开放定址线性探测（画图版）': {
    group: 'GoC 可视化·查找与字符串',
    stdin: '',
    code: `// 开放定址线性探测的可视化版（局部重绘）：标题/说明/下标标签/表头/图例只画一次，
// 11 个槽各自一个槽位，脏跟踪，每帧只擦重画变了的那几个槽，不整屏 cls。
// 一排 11 个槽，h(k) = k % 11，冲突就 (h+i) % CAP 一格一格往后找空位。
// 黄 = 正在探测的槽，粉红 = 撞上的占用槽（冲突），绿 = 刚放入 / 查找命中，
// 白 = 空槽。原版那 7 个键 mod 11 全等于 1，所以会排成一条长队。
#include <goc.h>
#include <cstdio>
#include <cstring>

const int CAP = 11;
int keyTab[CAP], valTab[CAP], state[CAP];     // 状态：0 空 / 1 占用 / 2 墓碑

// ---- 画图用的全局状态 ----
int g_probe = -1;                             // 正在探测的槽
int g_placed = -1;                            // 这一帧刚放入的槽
int g_hit = -1;                               // 查找命中的槽
int g_missSlot = -1;                          // 查找撞上的真空位
int g_conf[CAP];                              // 本次操作里撞过的槽
int g_key = 0, g_h = 0, g_i = 0;
int g_phase = 0;                              // 0 空表 1 插入 2 查找 3 结束
char g_msg[128] = "";
char g_msg2[128] = "";
int insKey[8], insH[8], insP[8], insPos[8], insN = 0;
char findRes[3][128];
int findN = 0;

// ---- 局部重绘的脏跟踪 ----
int lastFill[CAP], lastBd[CAP];           // 槽的填充色 / 边框色
char lastTxt[CAP][64];                    // 槽里的内容（key=val 或「空」）
int lastProbe = -2, lastProbeI = -1;      // 探测指针画在哪
int lastInsN = 0, lastFindN = 0;          // 两张结果表已经画到第几行（只追加）
char lastMsg[192] = "", lastMsg2[192] = "";

double CX(int i) { return -340.0 + 68.0 * i; }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}

void arrow(double x1, double y1, double x2, double y2, double w, int col) {
    pen.c(col);
    seg(x1, y1, x2, y2, w);
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    double ux = dx / L, uy = dy / L, a = 10.0;
    seg(x2, y2, x2 + (-ux * 0.866 + uy * 0.5) * a, y2 + (-ux * 0.5 - uy * 0.866) * a, w);
    seg(x2, y2, x2 + (-ux * 0.866 - uy * 0.5) * a, y2 + (ux * 0.5 - uy * 0.866) * a, w);
}

void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

// 静态背景只画一次：标题、说明、11 个下标标签、表头、图例、两行结论，
// 全部落在动态槽位之外（下标标签在 y=258，槽擦到 y=250 为止）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("散列表：开放定址线性探测", 0, 26);
    txtL(-350, 296, "CAP = 11，h(k) = k % 11；冲突就 (h+i) % CAP 往后找空位", 8, 16);
    for (int i = 0; i < CAP; i++) {
        char b[32];
        snprintf(b, sizeof b, "[%d]", i);
        txt(CX(i), 258, b, 8, 14);
    }
    txtL(-340, 34, "key", 8, 15);
    txtL(-250, 34, "h", 8, 15);
    txtL(-160, 34, "探测次数", 8, 15);
    txtL(-40, 34, "落点", 8, 15);
    txtL(120, 4, "黄 = 正在探测", 7, 15);
    txtL(120, -26, "粉 = 冲突（占用）", 1, 15);
    txtL(120, -56, "绿 = 放入 / 命中", 3, 15);
    txtL(120, -86, "白 = 空槽", 8, 15);
    txtL(-350, -200, "查找：沿探测序列走，遇到真空位就停", 2, 17);
    txtL(-350, -322, "7 个键全撞在 h=1，被排成下标 1..7；查 67 要探 6 次，查 99 探 1 次就停", 8, 15);
}

// 一个槽：框 + key + val（或「空」）。槽距 68，擦 64 宽不碰邻居；
// 擦 y 174..250：盖住框内所有文字，上不碰下标标签，下不碰探测箭头
void slotCell(int i) {
    double x = CX(i);
    int fill = 15, bd = 8;
    if (state[i] == 1) { fill = 15; bd = 2; }
    if (g_conf[i]) { fill = 9; bd = 1; }                  // 粉：冲突过
    if (i == g_placed || i == g_hit) { fill = 3; bd = 10; } // 绿：放入 / 命中
    if (i == g_missSlot) { fill = 9; bd = 1; }
    if (i == g_probe) { fill = 5; bd = (state[i] == 1 ? 1 : 2); } // 黄：正在探测
    char t[64];
    if (state[i] == 1) snprintf(t, sizeof t, "%d=%d", keyTab[i], valTab[i]);
    else snprintf(t, sizeof t, "空");
    if (fill == lastFill[i] && bd == lastBd[i] && strcmp(t, lastTxt[i]) == 0) return;
    pen.setAngle(0);
    pen.pu().moveTo(x, 212).pd().clsRec(64, 76);
    pen.pu().moveTo(x, 210).pd().c(fill).size(2).rr(60, 76, fill).r(60, 76, bd);
    if (state[i] == 1) {
        char b[32];
        snprintf(b, sizeof b, "%d", keyTab[i]);
        txt(x, 222, b, 0, 20);
        snprintf(b, sizeof b, "=%d", valTab[i]);
        txt(x, 192, b, 8, 14);
    } else {
        txt(x, 210, "空", 8, 16);
    }
    lastFill[i] = fill; lastBd[i] = bd;
    snprintf(lastTxt[i], sizeof lastTxt[i], "%s", t);
}

// 探测指针：箭头 + i=几 一个槽（y 126..170），移动时先擦旧槽
void probeMark() {
    if (g_probe == lastProbe && g_i == lastProbeI) return;
    pen.setAngle(0);
    if (lastProbe >= 0) pen.pu().moveTo(CX(lastProbe), 148).pd().clsRec(44, 44);
    if (g_probe >= 0) {
        arrow(CX(g_probe), 146, CX(g_probe), 166, 3, 1);
        char b[32];
        snprintf(b, sizeof b, "i=%d", g_i);
        txt(CX(g_probe), 134, b, 1, 14);
    }
    lastProbe = g_probe; lastProbeI = g_i;
}

// 两行说明：各自一个固定槽（x -350..150），文字变了才擦掉重写
void msgLine(double cy, double h, double y, const char* s, int col, int size, char* last) {
    if (strcmp(s, last) == 0) return;
    pen.setAngle(0);
    pen.pu().moveTo(-100, cy).pd().clsRec(500, h);
    if (s[0]) txtL(-350, y, s, col, size);
    snprintf(last, 192, "%s", s);
}

// 一帧：只刷新变了的槽 / 指针 / 说明，两张结果表只追加新行
void drawTab() {
    for (int i = 0; i < CAP; i++) slotCell(i);
    probeMark();
    msgLine(108, 28, 108, g_msg, 0, 18, lastMsg);
    msgLine(76, 26, 76, g_msg2, 0, 17, lastMsg2);

    // 插入结果表：行内容写死不变，只画新增的那几行
    for (int r = lastInsN; r < insN; r++) {
        char b[64];
        double y = 4 - 28 * r;
        snprintf(b, sizeof b, "%d", insKey[r]); txtL(-340, y, b, 0, 16);
        snprintf(b, sizeof b, "%d", insH[r]);   txtL(-250, y, b, 0, 16);
        snprintf(b, sizeof b, "%d", insP[r]);   txtL(-160, y, b, 0, 16);
        snprintf(b, sizeof b, "%d", insPos[r]); txtL(-40, y, b, 0, 16);
    }
    lastInsN = insN;

    // 查找结果：同样只追加
    for (int r = lastFindN; r < findN; r++) txtL(-350, -232 - 28 * r, findRes[r], 0, 16);
    lastFindN = findN;
}

int insertLinear(int k, int v) {
    g_phase = 1; g_key = k; g_h = k % CAP;
    g_placed = -1; g_hit = -1; g_missSlot = -1;
    for (int i = 0; i < CAP; i++) g_conf[i] = 0;
    snprintf(g_msg, sizeof g_msg, "插入 key=%d：h = %d %% %d = %d", k, k, CAP, g_h);
    snprintf(g_msg2, sizeof g_msg2, "从 h 开始往后探测");
    g_probe = g_h; g_i = 0;
    drawTab(); wait(0.14);
    int probes = 0;
    for (int i = 0; i < CAP; ++i) {
        int p = (k + i) % CAP;
        ++probes;
        g_probe = p; g_i = i;
        if (state[p] == 1) {
            if (keyTab[p] == k) {
                valTab[p] = v;
                g_hit = p; g_probe = -1;
                snprintf(g_msg2, sizeof g_msg2, "同键覆盖 val=%d", v);
                drawTab(); wait(0.16);
                return probes;
            }
            g_conf[p] = 1;
            snprintf(g_msg2, sizeof g_msg2, "槽 %d 被 %d 占用 → 冲突，往后一格", p, keyTab[p]);
            drawTab(); wait(0.07);
            continue;
        }
        keyTab[p] = k; valTab[p] = v; state[p] = 1;
        g_placed = p; g_probe = -1;
        snprintf(g_msg2, sizeof g_msg2, "槽 %d 是空的 → 放入，共探测 %d 次", p, probes);
        drawTab(); wait(0.16);
        insKey[insN] = k; insH[insN] = g_h; insP[insN] = probes; insPos[insN] = p; insN++;
        return probes;
    }
    return -1;                            // 表满
}

int findKey(int k, int& outV) {
    g_phase = 2; g_key = k; g_h = k % CAP;
    g_placed = -1; g_hit = -1; g_missSlot = -1;
    for (int i = 0; i < CAP; i++) g_conf[i] = 0;
    snprintf(g_msg, sizeof g_msg, "查找 key=%d：h = %d %% %d = %d", k, k, CAP, g_h);
    snprintf(g_msg2, sizeof g_msg2, "沿探测序列往后走");
    g_probe = g_h; g_i = 0;
    drawTab(); wait(0.14);
    for (int i = 0; i < CAP; ++i) {
        int p = (k + i) % CAP;
        g_probe = p; g_i = i;
        if (state[p] == 0) {
            g_missSlot = p; g_probe = -1;
            snprintf(g_msg2, sizeof g_msg2, "槽 %d 是真空位 → 停，查无此键", p);
            drawTab(); wait(0.2);
            snprintf(findRes[findN], 128, "key=%d -> 查无此键（探测 %d 次就停）", k, i + 1);
            findN++;
            return -1;
        }
        if (state[p] == 1 && keyTab[p] == k) {
            outV = valTab[p];
            g_hit = p; g_probe = -1;
            snprintf(g_msg2, sizeof g_msg2, "槽 %d 命中 val=%d（探测 %d 次）", p, outV, i + 1);
            drawTab(); wait(0.2);
            snprintf(findRes[findN], 128, "key=%d -> 找到 val=%d（探测 %d 次）", k, outV, i + 1);
            findN++;
            return i + 1;
        }
        g_conf[p] = 1;
        snprintf(g_msg2, sizeof g_msg2, "槽 %d 是 %d，不是 %d → 继续往后", p, keyTab[p], k);
        drawTab(); wait(0.08);
    }
    return -1;
}

int main() {
    pen.speed(10);
    memset(state, 0, sizeof(state));
    for (int i = 0; i < CAP; i++) { lastFill[i] = -1; lastBd[i] = -1; lastTxt[i][0] = 0; }
    staticBg();
    drawTab();
    wait(0.35);
    int keys[7] = {12, 23, 34, 45, 56, 67, 78};   // 都 mod 11 容易撞车
    for (int i = 0; i < 7; ++i) insertLinear(keys[i], keys[i] * 10);
    int ks[3] = {34, 67, 99};
    for (int i = 0; i < 3; ++i) {
        int v = -1;
        findKey(ks[i], v);
    }
    g_phase = 3; g_probe = -1;
    snprintf(g_msg, sizeof g_msg, "插入 7 个键 + 查找 3 次，全部完成");
    snprintf(g_msg2, sizeof g_msg2, "装载因子 7/11：越满，探测链越长，查找越慢");
    drawTab();
    wait(0.6);
    printf("线性探测 CAP=11：7 个键都 hash 到 1，依次落在下标 1..7；查 34 探 3 次、67 探 6 次、99 探 1 次即停。\\n");
    return 0;
}
`,
  },
  'Trie 字典树（二维数组）（画图版）': {
    group: 'GoC 可视化·查找与字符串',
    stdin: '',
    code: `// Trie 字典树（二维数组 nxt[节点][字母]）的可视化版（局部重绘）。
// 标题/说明只画一次；节点和边各自脏跟踪：只擦重画「移动了 / 换色了 / 计数变了」
// 的那几个，擦掉的矩形登记下来，被擦到的边和节点补画，不整屏 cls。
// 26 个孩子里用不到的不画，只画真实存在的边；节点里是它对应的字母，
// 节点下方是 passCnt（经过这个前缀的单词数），双圈 = isEnd 完整单词。
// 黄 = 正在走的节点，绿 = 这一帧新建的节点 / 查询命中的完整单词，
// 红 = 查询走不下去。单词与查询都和原版一致。
#include <goc.h>
#include <cstdio>
#include <cstring>

int nxt[64][26];
int isEnd[64], passCnt[64], nodes;
char nch[64];                                 // 每个节点对应的字母（根没有）

const char* words[6] = {"to", "tea", "ted", "ten", "in", "inn"};
const char* query[5] = {"tea", "te", "ten", "inn", "toe"};

double X[64], Y[64];
int leafSlot = 0;

// ---- 画图用的全局状态 ----
int g_cur = -1, g_new = -1, g_fail = -1;
int g_path[64], g_pathN = 0;                  // 查询走过的路径
char g_word[16] = "";
int g_wlen = 0, g_wpos = 0;
int g_phase = 0;                              // 0 空树 1 插入 2 查询 3 结束
char g_msg[128] = "";
char g_msg2[128] = "";
char g_qres[160] = "";

// ---- 局部重绘：节点 / 边的脏跟踪 ----
int par[64];                                  // 每个节点的父亲（根是 -1）
int nFill[64], nBd[64];                       // 这一帧想要的节点颜色
int lFill[64], lBd[64], lEnd[64], lPass[64], lDrawn[64];
double lX[64], lY[64];                        // 上一帧画出来的位置（排版会变）
int eCol[64], eW[64];                         // 入边（按孩子下标）想要的颜色 / 线宽
int leCol[64], leW[64], leDrawn[64];
double leX1[64], leY1[64], leX2[64], leY2[64];
int dn[64], pn[64], de[64], pe[64];           // 要不要擦 / 要不要画
int lastWFill[4], lastWCh[4];                 // 当前单词的格子
char lastMsg[192] = "", lastMsg2[192] = "", lastQres[192] = "";
int lastPhase3 = 0;

// 擦掉的矩形登记下来：谁被擦到谁补画（节点槽 88×80，含右上编号和下方 passCnt）
const int MAXR = 640;
const double NSW = 88, NSH = 80;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                          // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

int segHitRect(double x1, double y1, double x2, double y2,
               double cx, double cy, double w, double h) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        if (fabs(x1 + dx * t - cx) <= w / 2 && fabs(y1 + dy * t - cy) <= h / 2) return 1;
    }
    return 0;
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

// 排版：纵坐标按深度，横坐标按叶子从左到右铺开，父节点取孩子的中点
void layout(int p, int d) {
    Y[p] = 246.0 - 100.0 * d;
    int c2 = 0;
    double sum = 0;
    for (int c = 0; c < 26; c++) {
        int q = nxt[p][c];
        if (q != -1) { par[q] = p; layout(q, d + 1); sum += X[q]; c2++; }
    }
    if (c2 == 0) X[p] = -320.0 + 150.0 * (leafSlot++);
    else X[p] = sum / c2;
}
void relayout() { leafSlot = 0; par[0] = -1; layout(0, 0); }

// 静态背景只画一次：标题、说明、底部那行前缀统计，都在动态槽位之外
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("Trie 字典树（二维数组）", 0, 26);
    txtL(-350, 296, "nxt[节点][字母] = 孩子号，-1 就是没有这条边；插查都是 O(串长)", 8, 16);
    txtL(-350, -292, "te 不是完整单词，但 passCnt=3：tea/ted/ten 都经过它（前缀统计）", 8, 15);
}

// 一条入边（q 是孩子）：只画这一条，颜色线宽用这一帧算好的
void paintEdge(int q) {
    int p = par[q];
    pen.c(eCol[q]);
    seg(X[p], Y[p] - 24, X[q], Y[q] + 24, eW[q]);
}

// 一个节点：圈 + 字母 + 右上编号 + 下方 passCnt，整个槽一次画全
void paintNode(int p) {
    pen.setAngle(0);
    pen.pu().moveTo(X[p], Y[p]).pd().c(nFill[p]).size(2).oo(24, nFill[p]).o(24, nBd[p]);
    if (isEnd[p]) pen.pu().moveTo(X[p], Y[p]).pd().size(2).o(29, 10);
    if (p == 0) txt(X[p], Y[p], "根", 0, 18);
    else {
        char b[2];
        b[0] = nch[p]; b[1] = 0;
        txt(X[p], Y[p], b, 0, 22);
    }
    char b[32];
    snprintf(b, sizeof b, "%d", p);
    txt(X[p] + 32, Y[p] + 22, b, 8, 12);
    if (p > 0) {
        snprintf(b, sizeof b, "经过%d", passCnt[p]);
        txt(X[p], Y[p] - 40, b, 8, 12);
    }
}

// 当前单词的格子：按屏幕槽位记脏，走过的标绿、正在处理的标黄
void drawWord() {
    for (int j = 0; j < 4; j++) {
        int fill = -1, ch = 0;
        if (j < g_wlen) {
            fill = 15;
            if (j < g_wpos) fill = 3;
            if (j == g_wpos) fill = 5;
            ch = (int)(unsigned char)g_word[j];
        }
        if (fill == lastWFill[j] && ch == lastWCh[j]) continue;
        double x = -336 + 46 * j;
        pen.setAngle(0);
        pen.pu().moveTo(x, -140).pd().clsRec(44, 46);   // 槽距 46，擦 44 不碰邻居
        if (fill >= 0) {
            pen.pu().moveTo(x, -140).pd().c(fill).size(2).rr(40, 42, fill).r(40, 42, 2);
            char b[2];
            b[0] = (char)ch; b[1] = 0;
            txt(x, -140, b, 0, 20);
        }
        lastWFill[j] = fill; lastWCh[j] = ch;
    }
}

// 三行说明：各自一个固定槽（x -350..270），文字变了才擦掉重写
void msgSlot(double cy, double h, double y, const char* s, int col, int size, char* last) {
    if (strcmp(s, last) == 0) return;
    pen.setAngle(0);
    pen.pu().moveTo(-40, cy).pd().clsRec(620, h);
    if (s[0]) txtL(-350, y, s, col, size);
    snprintf(last, 192, "%s", s);
}

void drawTrie() {
    erN = 0;
    // 1) 节点这一帧想要的样子：只有换色是不透明实心原位盖，移动/换计数要先擦旧槽
    for (int p = 0; p < nodes; p++) {
        int fill = 15, bd = 2;
        if (isEnd[p]) bd = 10;
        if (p == g_cur) { fill = 5; bd = 7; }
        if (p == g_new) { fill = 3; bd = 10; }
        if (p == g_fail) { fill = 9; bd = 1; }
        nFill[p] = fill; nBd[p] = bd;
        dn[p] = (!lDrawn[p] || X[p] != lX[p] || Y[p] != lY[p] || passCnt[p] != lPass[p]) ? 1 : 0;
        pn[p] = (dn[p] || fill != lFill[p] || bd != lBd[p] || isEnd[p] != lEnd[p]) ? 1 : 0;
    }
    // 2) 边这一帧想要的样子：查询路径加粗标绿，新建节点的入边也标绿
    for (int q = 0; q < nodes; q++) {
        de[q] = 0; pe[q] = 0;
        if (par[q] < 0) continue;
        int col = 8, w = 2;
        for (int k = 0; k + 1 < g_pathN; k++)
            if (g_path[k] == par[q] && g_path[k + 1] == q) { col = 3; w = 4; }
        if (q == g_new) { col = 3; w = 4; }
        eCol[q] = col; eW[q] = w;
        double x1 = X[par[q]], y1 = Y[par[q]] - 24, x2 = X[q], y2 = Y[q] + 24;
        if (!leDrawn[q] || x1 != leX1[q] || y1 != leY1[q] || x2 != leX2[q] || y2 != leY2[q]
            || col != leCol[q] || w != leW[q]) { de[q] = 1; pe[q] = 1; }
    }
    // 3) 擦：脏节点的旧槽 + 脏边的旧走廊
    for (int p = 0; p < nodes; p++)
        if (dn[p] && lDrawn[p]) eraseBox(lX[p] + 6, lY[p] - 8, NSW, NSH);
    for (int q = 0; q < nodes; q++)
        if (de[q] && leDrawn[q]) eraseSeg(leX1[q], leY1[q], leX2[q], leY2[q]);
    // 4) 补画：被擦到的边 / 节点也要重画，重画的边会盖到端点节点
    for (int q = 0; q < nodes; q++) {
        if (par[q] < 0 || pe[q]) continue;
        if (segHitEr(X[par[q]], Y[par[q]] - 24, X[q], Y[q] + 24, 3)) pe[q] = 1;
    }
    for (int p = 0; p < nodes; p++)
        if (!pn[p] && rectHitEr(X[p] + 6, Y[p] - 8, NSW, NSH)) pn[p] = 1;
    for (int q = 0; q < nodes; q++) if (pe[q] && par[q] >= 0) { pn[q] = 1; pn[par[q]] = 1; }
    for (int q = 0; q < nodes; q++) {
        if (!pe[q] || par[q] < 0) continue;
        for (int p = 0; p < nodes; p++)
            if (!pn[p] && segHitRect(X[par[q]], Y[par[q]] - 24, X[q], Y[q] + 24,
                                     X[p] + 6, Y[p] - 8, NSW, NSH)) pn[p] = 1;
    }
    // 5) 先边后点（和原版一个层次）
    for (int q = 0; q < nodes; q++) if (pe[q] && par[q] >= 0) paintEdge(q);
    for (int p = 0; p < nodes; p++) if (pn[p]) paintNode(p);
    // 6) 记下这一帧画出来的样子
    for (int p = 0; p < nodes; p++) {
        lDrawn[p] = 1; lX[p] = X[p]; lY[p] = Y[p];
        lFill[p] = nFill[p]; lBd[p] = nBd[p]; lEnd[p] = isEnd[p]; lPass[p] = passCnt[p];
    }
    for (int q = 0; q < nodes; q++) {
        if (par[q] < 0) continue;
        leDrawn[q] = 1; leCol[q] = eCol[q]; leW[q] = eW[q];
        leX1[q] = X[par[q]]; leY1[q] = Y[par[q]] - 24; leX2[q] = X[q]; leY2[q] = Y[q] + 24;
    }

    // 当前单词 + 三行说明
    drawWord();
    msgSlot(-190, 26, -190, g_msg, 0, 17, lastMsg);
    msgSlot(-220, 26, -220, g_msg2, 8, 16, lastMsg2);
    msgSlot(-260, 26, -260, g_qres, 2, 16, lastQres);
    if (g_phase == 3 && !lastPhase3) {
        pen.setAngle(0);
        pen.pu().moveTo(-40, -324).pd().clsRec(620, 26);
        txtL(-350, -324, "6 个单词共用 10 个节点，根的出边只有 t 和 i", 3, 17);
        lastPhase3 = 1;
    }
}

void initTrie() {
    memset(nxt, -1, sizeof(nxt));
    memset(isEnd, 0, sizeof(isEnd));
    memset(passCnt, 0, sizeof(passCnt));
    memset(nch, 0, sizeof(nch));
    memset(lDrawn, 0, sizeof(lDrawn));
    memset(leDrawn, 0, sizeof(leDrawn));
    for (int i = 0; i < 64; i++) par[i] = -1;
    for (int j = 0; j < 4; j++) { lastWFill[j] = -1; lastWCh[j] = 0; }
    nodes = 1;                         // 0 号是根
}

void insertWord(const char* s) {
    g_phase = 1;
    snprintf(g_word, sizeof g_word, "%s", s);
    g_wlen = (int)strlen(s); g_wpos = 0;
    g_new = -1; g_fail = -1; g_pathN = 0;
    g_cur = 0;
    snprintf(g_msg, sizeof g_msg, "插入 %s：从根开始逐个字母走", s);
    g_msg2[0] = 0;
    drawTrie(); wait(0.08);
    int p = 0;
    for (int i = 0; s[i]; ++i) {
        int c = s[i] - 'a';
        g_wpos = i;
        if (nxt[p][c] == -1) {
            nxt[p][c] = nodes++;
            nch[nodes - 1] = (char)('a' + c);
            relayout();
            g_new = nodes - 1;
            snprintf(g_msg2, sizeof g_msg2, "nxt[%d][%c] = -1 → 新建节点 %d", p, s[i], nodes - 1);
        } else {
            g_new = -1;
            snprintf(g_msg2, sizeof g_msg2, "nxt[%d][%c] = %d 已存在 → 共享前缀", p, s[i], nxt[p][c]);
        }
        p = nxt[p][c];
        ++passCnt[p];                 // 经过这个节点的单词数
        g_cur = p;
        drawTrie(); wait(0.12);
    }
    isEnd[p] = 1;
    g_wpos = g_wlen;
    snprintf(g_msg, sizeof g_msg, "%s 插完：节点 %d 标成完整单词（双圈）", s, p);
    drawTrie(); wait(0.08);
}

int findWord(const char* s, int& passes) {
    g_phase = 2;
    snprintf(g_word, sizeof g_word, "%s", s);
    g_wlen = (int)strlen(s); g_wpos = 0;
    g_new = -1; g_fail = -1;
    g_pathN = 0; g_path[g_pathN++] = 0;
    g_cur = 0;
    snprintf(g_msg, sizeof g_msg, "查询 %s：沿 nxt 往下走", s);
    g_msg2[0] = 0;
    drawTrie(); wait(0.08);
    int p = 0;
    for (int i = 0; s[i]; ++i) {
        int c = s[i] - 'a';
        g_wpos = i;
        if (nxt[p][c] == -1) {
            g_fail = p;
            snprintf(g_msg2, sizeof g_msg2, "nxt[%d][%c] = -1 → 走不下去，不存在", p, s[i]);
            drawTrie(); wait(0.2);
            passes = 0;
            return 0;
        }
        p = nxt[p][c];
        g_path[g_pathN++] = p;
        g_cur = p;
        snprintf(g_msg2, sizeof g_msg2, "走到节点 %d，passCnt = %d", p, passCnt[p]);
        drawTrie(); wait(0.09);
    }
    passes = passCnt[p];
    g_wpos = g_wlen;
    if (isEnd[p]) {
        g_new = p;
        snprintf(g_msg2, sizeof g_msg2, "isEnd=1 → 是完整单词，前缀下有 %d 个", passes);
    } else {
        snprintf(g_msg2, sizeof g_msg2, "isEnd=0 → 只是前缀，下面有 %d 个单词", passes);
    }
    drawTrie(); wait(0.18);
    return isEnd[p];
}

int main() {
    pen.speed(10);
    initTrie();
    relayout();
    staticBg();
    drawTrie();
    wait(0.35);
    for (int i = 0; i < 6; ++i) insertWord(words[i]);
    g_qres[0] = 0;
    for (int i = 0; i < 5; ++i) {
        int passes = 0;
        int whole = findWord(query[i], passes);
        char b[64];
        snprintf(b, sizeof b, "%s:%s  ", query[i], whole ? "完整" : (passes > 0 ? "前缀" : "不存在"));
        strcat(g_qres, b);
    }
    g_phase = 3; g_cur = -1; g_new = -1; g_fail = -1; g_wlen = 0; g_pathN = 0;
    snprintf(g_msg, sizeof g_msg, "插入 6 个单词 + 查询 5 次，全部完成");
    snprintf(g_msg2, sizeof g_msg2, "共用 %d 个节点（字母总数 16，前缀共享省了 6 个）", nodes);
    drawTrie();
    wait(0.7);
    printf("Trie：6 个单词共用 10 个节点；tea/ten/inn 是完整单词，te 只是前缀（3 个），toe 不存在。\\n");
    return 0;
}
`,
  },
  'Rabin-Karp 滚动哈希匹配（画图版）': {
    group: 'GoC 可视化·查找与字符串',
    stdin: '',
    code: `// Rabin-Karp 滚动哈希匹配的可视化版（局部重绘）：标题/说明/hp/结论只画一次，
// 文本格/模式格/进度格脏跟踪只擦重画变化的；窗口外框拆成 4 条擦，
// 擦到的格子登记补画。上面是文本串格子，下面是模式串格子，
// 模式串跟着窗口一起右移，旁边实时显示两个哈希值的比较。
// 黄框 = 当前窗口，绿 = 哈希相等且逐字符核对通过（命中），
// 红 = 哈希不等（直接滚走，一个字符都不用比）。文本与模式和原版一致。
#include <goc.h>
#include <cstdio>
#include <cstring>

typedef unsigned long long ULL;
const ULL BASE = 131;
const char* text = "abababcaabababcab";
const char* pat = "ababc";
const int N = 17, M = 5;

// ---- 画图用的全局状态 ----
int g_i = 0;                                  // 当前窗口左端
ULL g_ht = 0, g_hp = 0, g_rollTo = 0;
int g_eq = 0;                                 // 哈希是否相等
int g_verify = 0;                             // 正在逐字符核对
int g_roll = 0;                               // 这一帧在演示滚动
int g_hit[16], g_hitN = 0;
int g_verified = 0;
int g_done = 0;

// ---- 局部重绘：脏跟踪 + 擦除登记 ----
int lastTFill[17], lastProgFill[13];
char lastPatSig[17][24];                      // 模式格按屏幕列跟踪（窗口会右移）
int lastFrameOn = -1, lastFrameI = -1, lastFrameC = -1;
char lastHt[192] = "", lastEq[192] = "", lastRoll[192] = "";
char lastHits[192] = "", lastVer[192] = "";
int lastDone = 0;

const int MAXR = 64;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

double TX(int i) { return -336.0 + 42.0 * i; }

void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                          // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}
int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

// 静态背景只画一次：标题 / 说明 / 模式标签 / hp / 窗口标签 / 结论
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("Rabin-Karp 滚动哈希匹配", 0, 26);
    txtL(-350, 296, "131 进制哈希：窗口右移 = 减最高位×131^4，再×131 加新字符（O(1)）", 8, 15);
    txtL(-350, 168, "模式 p = ababc（长度 5，跟着窗口右移）", 8, 15);
    char b[192];
    snprintf(b, sizeof b, "hp = %llu（模式哈希，固定）", g_hp);
    txtL(-350, 34, b, 11, 18);
    txtL(-350, -168, "13 个窗口：", 8, 15);
    txtL(-350, -215, "平均 O(n+m)，最坏仍 O(nm)（哈希全撞时）；结果和朴素匹配一致", 0, 16);
    txtL(-350, -248, "哈希相等只是「可能匹配」，必须再逐字符核对一次防碰撞", 8, 15);
}

void textCell(int i, int fill) {
    pen.setAngle(0);
    pen.pu().moveTo(TX(i), 240).pd().size(2).rr(38, 44, fill).r(38, 44, 8);
    char b[2];
    b[0] = text[i]; b[1] = 0;
    txt(TX(i), 240, b, 0, 20);
    char nb[8];
    snprintf(nb, sizeof nb, "%d", i);
    txt(TX(i), 200, nb, 8, 12);
}

void patCol(int c, int ch, int fill, int mark) {
    if (ch < 0) return;                       // 这一列没有模式字符：旧槽已擦掉
    pen.setAngle(0);
    pen.pu().moveTo(TX(c), 120).pd().size(2).rr(38, 44, fill).r(38, 44, 2);
    char b[2];
    b[0] = (char)ch; b[1] = 0;
    txt(TX(c), 120, b, 0, 20);
    if (mark) txt(TX(c), 78, mark == 1 ? "=" : "!=", mark == 1 ? 10 : 1, 18);
}

void progCell(int i, int fill) {
    double x = -230 + 34 * i;
    pen.setAngle(0);
    pen.pu().moveTo(x, -168).pd().size(2).rr(26, 26, fill).r(26, 26, 8);
    char nb[8];
    snprintf(nb, sizeof nb, "%d", i);
    txt(x, -168, nb, 0, 13);
}

void frameBox(double cx, int wc) {
    pen.setAngle(0);
    pen.pu().moveTo(cx, 240).pd().c(wc).size(4).r(216, 58, wc);
}

// 面板文字行：内容变了或被别人擦到才擦槽重画（槽位互不重叠，也不碰静态）
void panelLine(double cx, double cy, double w, double h,
               double x, double y, const char* s, int col, int size, char* last) {
    if (strcmp(s, last) == 0 && !rectHitEr(cx, cy, w, h)) return;
    eraseBox(cx, cy, w, h);
    if (s[0]) txtL(x, y, s, col, size);
    strcpy(last, s);
}

void drawRK() {
    erN = 0;
    // 1) 算出这一帧想要的状态
    int tf[17], pf[13];
    for (int i = 0; i < N; i++) {
        int fill = 15;
        for (int k = 0; k < g_hitN; k++)
            if (i >= g_hit[k] && i < g_hit[k] + M) fill = 3;      // 绿：命中段
        if (!g_done && i >= g_i && i < g_i + M && fill != 3) fill = 5;
        tf[i] = fill;
    }
    for (int i = 0; i <= N - M; i++) {
        int fill = 15;
        for (int k = 0; k < g_hitN; k++) if (g_hit[k] == i) fill = 3;
        if (!g_done && i == g_i) fill = 5;
        pf[i] = fill;
    }
    int frameOn = !g_done;
    double cx = frameOn ? (TX(g_i) + TX(g_i + M - 1)) / 2 : 0;
    int wc = g_eq ? 3 : 5;
    // 模式字符按屏幕列跟踪：窗口右移时旧列消失、新列出现
    int pch[17], pfill[17], pmark[17];
    char psig[17][24];
    for (int c = 0; c < N; c++) {
        if (frameOn && c >= g_i && c < g_i + M) {
            int j = c - g_i;
            pch[c] = pat[j];
            pfill[c] = g_verify ? ((text[c] == pat[j]) ? 3 : 1) : 15;
            pmark[c] = g_verify ? ((text[c] == pat[j]) ? 1 : 2) : 0;
        } else { pch[c] = -1; pfill[c] = 0; pmark[c] = 0; }
        snprintf(psig[c], sizeof psig[c], "%d:%d:%d", pch[c], pfill[c], pmark[c]);
    }
    char sHt[192], sEq[192], sRoll[192], sHits[192], sVer[192];
    snprintf(sHt, sizeof sHt, "ht = %llu（窗口哈希）", g_ht);
    sEq[0] = 0;
    if (!g_done) strcpy(sEq, g_eq ? "ht == hp → 逐字符核对" : "ht != hp → 直接滚走");
    sRoll[0] = 0;
    if (g_roll)
        snprintf(sRoll, sizeof sRoll, "滚动：ht = (ht - '%c'×131^4)×131 + '%c' = %llu",
                 text[g_i], text[g_i + M], g_rollTo);
    strcpy(sHits, "命中位置：");
    for (int k = 0; k < g_hitN; k++) {
        char t2[16];
        snprintf(t2, sizeof t2, "%d ", g_hit[k]);
        strcat(sHits, t2);
    }
    snprintf(sVer, sizeof sVer, "哈希相等 %d 次 → 只在这 %d 次逐字符核对（朴素要比 13×5=65 次）",
             g_verified, g_verified);

    // 2) 只擦变了的旧槽（文本格槽 40×76：y192..268，盖住格子和下标）
    for (int i = 0; i < N; i++)
        if (tf[i] != lastTFill[i]) eraseBox(TX(i), 230, 40, 76);
    int frameDirty = (frameOn != lastFrameOn) ||
                     (frameOn && (g_i != lastFrameI || wc != lastFrameC));
    if (frameDirty && lastFrameOn == 1) {     // 外框拆成 4 条擦，只擦框自己的走廊
        double ocx = (TX(lastFrameI) + TX(lastFrameI + M - 1)) / 2;
        eraseBox(ocx, 269, 224, 8);
        eraseBox(ocx, 212, 224, 8);
        eraseBox(ocx - 108, 240, 8, 64);
        eraseBox(ocx + 108, 240, 8, 64);
    }
    for (int c = 0; c < N; c++)
        if (strcmp(psig[c], lastPatSig[c]) != 0) eraseBox(TX(c), 105, 40, 80);
    for (int i = 0; i <= N - M; i++)
        if (pf[i] != lastProgFill[i]) eraseBox(-230 + 34 * i, -168, 30, 30);

    // 3) 被擦到的要补画：外框和文本格互相擦，登记下来统一补
    int tNeed[17], pNeed[17], prNeed[13];
    for (int i = 0; i < N; i++)
        tNeed[i] = (tf[i] != lastTFill[i]) || rectHitEr(TX(i), 230, 40, 76);
    for (int c = 0; c < N; c++)
        pNeed[c] = (strcmp(psig[c], lastPatSig[c]) != 0) || rectHitEr(TX(c), 105, 40, 80);
    for (int i = 0; i <= N - M; i++)
        prNeed[i] = (pf[i] != lastProgFill[i]) || rectHitEr(-230 + 34 * i, -168, 30, 30);
    int fNeed = frameOn && (frameDirty || rectHitEr(cx, 240, 224, 64));

    // 4) 重画：先格子，外框最后画（框压在格子上）
    for (int i = 0; i < N; i++) if (tNeed[i]) textCell(i, tf[i]);
    for (int c = 0; c < N; c++) if (pNeed[c]) patCol(c, pch[c], pfill[c], pmark[c]);
    for (int i = 0; i <= N - M; i++) if (prNeed[i]) progCell(i, pf[i]);
    panelLine(-210, 0, 290, 28, -350, 0, sHt, 2, 18, lastHt);
    panelLine(170, 17, 230, 28, 60, 17, sEq, g_eq ? 3 : 1, 18, lastEq);
    panelLine(-100, -44, 500, 26, -350, -44, sRoll, 7, 16, lastRoll);
    panelLine(-190, -90, 320, 28, -350, -90, sHits, 3, 18, lastHits);
    panelLine(-100, -124, 500, 24, -350, -124, sVer, 8, 15, lastVer);
    if (fNeed) frameBox(cx, wc);
    if (g_done && !lastDone) {
        txtL(-350, -292, "RK 命中位置：2 10（哈希比对 2 次，只核对了 10 个字符）", 3, 18);
        lastDone = 1;
    }

    // 5) 记录这一帧的状态
    for (int i = 0; i < N; i++) lastTFill[i] = tf[i];
    for (int i = 0; i <= N - M; i++) lastProgFill[i] = pf[i];
    for (int c = 0; c < N; c++) strcpy(lastPatSig[c], psig[c]);
    lastFrameOn = frameOn; lastFrameI = g_i; lastFrameC = wc;
}

int main() {
    pen.speed(10);
    int n = (int)strlen(text), m = (int)strlen(pat);

    ULL pw = 1;
    for (int i = 1; i < m; ++i) pw *= BASE;      // BASE^(m-1)
    ULL hp = 0, ht = 0;
    for (int i = 0; i < m; ++i) {
        hp = hp * BASE + (unsigned char)pat[i];
        ht = ht * BASE + (unsigned char)text[i];
    }
    g_hp = hp; g_ht = ht; g_i = 0;
    for (int i = 0; i < N; i++) lastTFill[i] = -1;
    for (int i = 0; i <= N - M; i++) lastProgFill[i] = -1;
    for (int c = 0; c < N; c++) strcpy(lastPatSig[c], "-1:0:0");
    staticBg();
    drawRK();
    wait(0.4);

    for (int i = 0; i + m <= n; ++i) {
        g_i = i; g_ht = ht; g_roll = 0; g_verify = 0;
        g_eq = (ht == hp);
        drawRK(); wait(0.13);
        if (ht == hp) {
            ++g_verified;                          // 哈希命中才逐字符核对
            g_verify = 1;
            drawRK(); wait(0.2);
            int ok = 1;
            for (int j = 0; j < m; ++j) if (text[i + j] != pat[j]) { ok = 0; break; }
            if (ok) {
                g_hit[g_hitN++] = i;
                drawRK(); wait(0.18);
            }
            g_verify = 0;
        }
        if (i + m < n) {
            ULL nh = (ht - (unsigned char)text[i] * pw) * BASE + (unsigned char)text[i + m];
            g_roll = 1; g_rollTo = nh;
            drawRK(); wait(0.09);
            ht = nh;
            g_roll = 0;
        }
    }

    // 朴素对照（不画，只用来核对结果）
    int naive[16], naiveN = 0;
    for (int i = 0; i + m <= n; ++i) {
        int ok = 1;
        for (int j = 0; j < m; ++j) if (text[i + j] != pat[j]) { ok = 0; break; }
        if (ok) naive[naiveN++] = i;
    }
    g_done = 1;
    drawRK();
    wait(0.6);
    printf("RK 命中位置：");
    for (int k = 0; k < g_hitN; k++) printf("%d ", g_hit[k]);
    printf("（哈希比对 %d 次）；朴素对照：", g_verified);
    for (int k = 0; k < naiveN; k++) printf("%d ", naive[k]);
    printf("两种结果一致。\\n");
    return 0;
}
`,
  },
  '时间复杂度各阶对照（画图版）': {
    group: 'GoC 可视化·复杂度',
    stdin: '',
    code: `// 时间复杂度各阶对照（局部重绘）：把 O(1)/O(log n)/O(n)/O(n log n)/O(n^2)/O(2^n)
// 的操作次数画成增长曲线，n 从 1 长到 20。曲线逐帧只追加新线段，旧段绝不擦；
// 标题/网格/坐标轴/表头色条只画一次，数值表脏跟踪只擦变化的数。
// 纵轴取 log10(次数)，不然 2^20 会把别的曲线全压成一条贴着横轴的线。
// 次数是算出来的，不是真跑出来的。红圈 = 曲线的交点，下方表里另给 O(n!)。
#include <goc.h>
#include <cstdio>
#include <cmath>
#include <cstring>

long long ops_const(int n) { return 1; }
long long ops_linear(int n) { return n; }
long long ops_quad(int n)   { return 1LL * n * n; }
long long ops_log(int n)    { int c = 0; while ((1LL << c) <= n) ++c; return c; }
long long ops_nlogn(int n)  { return 1LL * n * ops_log(n); }
long long ops_exp(int n)    { return 1LL << n; }
long long ops_fact(int n)   { long long r = 1; for (int i = 2; i <= n; ++i) r *= i; return r; }

const char* cname[7] = {"O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)", "O(2^n)", "O(n!)"};
int ccol[7] = {8, 12, 2, 11, 14, 1, 6};
long long V[21][7];                           // V[n][k]：第 k 阶在 n 处的操作次数
int g_n = 1;                                  // 这一帧画到 n

// ---- 局部重绘：曲线只追加，数值表脏跟踪 ----
int lastN = 0;                                // 曲线已经画到哪个 n（0 = 还没画）
int lastTick = -1;                            // 轴下扫描刻度上一帧的 n
long long lastVal[7];
char lastHdr[128] = "";
int mark10 = 0, mark20 = 0, mark2 = 0, mark4 = 0;

double PX(int n) { return -320.0 + 33.0 * n; }
double PY(long long v) {
    double t = log10((double)v);
    if (t < 0) t = 0;
    if (t > 6.5) t = 6.5;
    return -30.0 + t / 6.5 * 280.0;
}

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                          // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
}

// 静态背景只画一次：标题 / 网格 / 坐标轴 / 刻度 / 交点说明 / 表的色条和名字 / 结论
// （x 刻度标签挪到 y=-54，给轴下的扫描刻度让出槽位，不碰曲线端点圆点）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("时间复杂度各阶对照", 0, 26);
    txtL(-350, 296, "纵轴 log10(操作次数)：一张图放下 1 到 10^6；次数是算出来的，不是真跑的", 8, 15);
    const char* lab[7] = {"1", "10", "100", "1k", "10k", "100k", "1M"};
    for (int k = 0; k <= 6; k++) {
        double y = -30.0 + k / 6.5 * 280.0;
        pen.c(8);
        seg(-320, y, 350, y, 1);
        txtL(-378, y - 7, lab[k], 8, 13);
    }
    pen.c(0);
    seg(-320, -30, 355, -30, 2);
    seg(-320, -30, -320, 252, 2);
    for (int n = 0; n <= 20; n += 5) {
        char b[8];
        snprintf(b, sizeof b, "%d", n);
        txt(PX(n), -54, b, 8, 13);
    }
    txt(362, -54, "n", 0, 15);
    txtL(-318, 258, "操作次数", 8, 14);
    txtL(-350, -72, "交点：n=2 时 n log n = n^2 = 2^n = 4；n=4 时 n^2 = 2^n = 16，指数从此反超平方", 1, 15);
    for (int k = 0; k < 7; k++) {
        double x = (k < 4) ? -350 : 30;
        double y = -136 - 34 * (k % 4);
        pen.c(ccol[k]);
        seg(x, y, x + 26, y, 4);
        txtL(x + 34, y - 8, cname[k], ccol[k], 17);
    }
    txtL(-350, -278, "n 从 10 翻到 20：O(1) 不变，O(n) ×2，O(n^2) ×4，O(2^n) ×1024", 0, 16);
    txtL(-350, -310, "O(n!) ×670442572800 —— 阶乘最恐怖，20! ≈ 2.4×10^18 早已冲出这张图", 8, 15);
}

// 曲线逐帧追加：只画 n-1 → n 的新线段和新端点圆点，旧段绝不擦不重画
void appendCurves(int n) {
    for (int k = 0; k < 6; k++) {
        pen.setAngle(0);
        if (n >= 2) {
            pen.pu().moveTo(PX(n - 1), PY(V[n - 1][k])).pd().c(ccol[k]).size(3);
            pen.lineTo(PX(n), PY(V[n][k]));
        }
        pen.pu().moveTo(PX(n), PY(V[n][k])).pd().c(ccol[k]).oo(5, ccol[k]);
    }
}

// 扫描指示改成轴下方的小刻度：槽位 y-44..-36，不碰轴线(-31..-29)、
// 曲线端点圆点(最低 -35)和刻度标签(顶 -46.2)
void scanTick(int n) {
    if (n == lastTick) return;
    if (lastTick >= 0) eraseBox(PX(lastTick), -40, 12, 8);
    pen.c(8);
    seg(PX(n), -38, PX(n), -42, 2);
    lastTick = n;
}

// 数值表：色条和名字是静态的，只有数值和表头随 n 变，脏跟踪擦槽重画
void valueTable() {
    char b[128];
    snprintf(b, sizeof b, "n = %d 时的操作次数", g_n);
    if (strcmp(b, lastHdr) != 0) {
        eraseBox(-183, -104, 336, 26);
        txtL(-350, -104, b, 0, 17);
        strcpy(lastHdr, b);
    }
    for (int k = 0; k < 7; k++) {
        if (V[g_n][k] == lastVal[k]) continue;
        double x = (k < 4) ? -350 : 30;
        double y = -136 - 34 * (k % 4);
        double cx = (k < 4) ? -133 : 270;
        double w = (k < 4) ? 136 : 190;
        eraseBox(cx, y - 8, w, 26);
        // 擦除框左缘贴着图例名字，按 z 序把色条和名字补画一遍，保证不留半擦残字
        pen.c(ccol[k]);
        seg(x, y, x + 26, y, 4);
        txtL(x + 34, y - 8, cname[k], ccol[k], 17);
        snprintf(b, sizeof b, "%lld", V[g_n][k]);
        txtL(x + 150, y - 8, b, 0, 17);
        lastVal[k] = V[g_n][k];
    }
}

void drawPlot() {
    // 数据：六条增长曲线，只追加这一帧新增的段
    for (int n = lastN + 1; n <= g_n; n++) appendCurves(n);
    if (g_n > lastN) lastN = g_n;
    scanTick(g_n);
    // 高亮：n=10/20 采样线和两个交点红圈，到达时画一次（静态累积）
    if (g_n >= 10 && !mark10) {
        mark10 = 1;
        pen.c(13);
        seg(PX(10), -30, PX(10), 250, 1);
        txt(PX(10), 262, "n=10", 13, 13);
    }
    if (g_n >= 20 && !mark20) {
        mark20 = 1;
        pen.c(13);
        seg(PX(20), -30, PX(20), 250, 1);
        txt(PX(20) - 24, 262, "n=20", 13, 13);
    }
    if (g_n >= 2 && !mark2) {
        mark2 = 1;
        pen.setAngle(0);
        pen.pu().moveTo(PX(2), PY(4)).pd().c(1).size(2).o(8, 1);
    }
    if (g_n >= 4 && !mark4) {
        mark4 = 1;
        pen.setAngle(0);
        pen.pu().moveTo(PX(4), PY(16)).pd().c(1).size(3).o(9, 1);
    }
    valueTable();
}

int main() {
    pen.speed(10);
    for (int n = 1; n <= 20; n++) {
        V[n][0] = ops_const(n);
        V[n][1] = ops_log(n);
        V[n][2] = ops_linear(n);
        V[n][3] = ops_nlogn(n);
        V[n][4] = ops_quad(n);
        V[n][5] = ops_exp(n);
        V[n][6] = ops_fact(n);
    }
    g_n = 1;
    for (int k = 0; k < 7; k++) lastVal[k] = -1;
    staticBg();
    drawPlot();
    wait(0.35);
    for (int n = 1; n <= 20; n++) {
        g_n = n;
        drawPlot();
        wait((n == 10 || n == 20) ? 0.3 : 0.14);
    }
    wait(0.6);
    printf("n=10→20：O(1) 1→1，O(log n) 4→5，O(n) 10→20，O(n log n) 40→100，O(n^2) 100→400，O(2^n) 1024→1048576，O(n!) 3628800→2432902008176640000。\\n");
    return 0;
}
`,
  },
  '空间复杂度：循环与递归（画图版）': {
    group: 'GoC 可视化·复杂度',
    stdin: '',
    code: `// 空间复杂度：循环 vs 递归（局部重绘）。左栏画循环的栈帧（main / loop / func，恒定 3 个，
// func 那一格随调用出现、随返回消失，不透明原位盖旧）；右栏画递归的栈格子，容量 500 层、
// 每格 25 层，随执行逐帧长高——栈容器作为一个槽位整体擦重画，刻度标签静态只画一次。
// 标题/分隔线/静态说明只画一次，下半屏按阶段切换擦一次，c[]/d[] 增长块原位盖旧。
// 绿 = 占用恒定 O(1)，红/橙 = 随深度增长 O(n)。数据与原版一致。
#include <goc.h>
#include <cstdio>

int func() {
    // 执行某些操作
    return 0;
}

// ---- 画图用的全局状态 ----
int g_phase = 0;                              // 0 循环 1 递归 2 变量
long long g_i = 0;                            // 循环跑到第几次
int g_funcIn = 0;                             // func 栈帧此刻在不在
int g_depth = 0;                              // 递归当前深度
int g_curN = 0;                               // 当前 recur(n) 的 n
int g_deepest = 0;
int g_up = 0;                                 // 正在回溯弹栈
int g_cN = 0, g_varN = 0;                     // c[] / d[] 已填多少

// ---- 局部重绘：各动态元素的上次状态 ----
int lastPhase = -1;
long long lastI = -1;
int lastFuncIn = -1;
double lastH = -1; int lastUp = -1;
int lastDepth = -1, lastCurN = -1, lastUpTxt = -1, lastDeepest = -1;
int lastCN = -1, lastVarN = -1;

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void txt(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, const char* s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void box(double x, double y, double w, double h, const char* s, int fill, int bd) {
    pen.pu().moveTo(x, y).pd().size(2).rr(w, h, fill).r(w, h, bd);
    txt(x, y, s, 0, 15);
}

// 静态背景只画一次：标题 / 分隔线 / 两栏标题 / main、loop 栈帧 / 左栏说明 /
// 右栏刻度标签和固定文字（容器壁、格子线、刻度线随栈帧在 stackBar 里重画）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("空间复杂度：循环与递归", 0, 26);
    txtL(-350, 296, "循环的临时变量用完就还；递归每多调一层就多占一个栈帧", 8, 16);
    pen.c(8);
    seg(-5, 270, -5, -150, 1);
    txtL(-350, 258, "循环 loop(1000000) → O(1)", 2, 19);
    txtL(30, 258, "递归 recur(500) → O(n)", 1, 19);
    pen.setAngle(0);
    box(-195, 205, 290, 44, "main 栈帧", 15, 2);
    box(-195, 150, 290, 50, "loop 栈帧：n、i", 15, 2);
    txtL(-350, 4, "栈帧数恒为 3 → O(1)", 3, 19);
    txtL(-350, -34, "i 只是被反复改写，没有新分配", 8, 15);
    txtL(-350, -66, "100 万次调用，峰值内存不变", 8, 15);
    for (int v = 0; v <= 500; v += 100) {
        double y = -150 + (v / 500.0) * 380.0;
        char nb[16];
        snprintf(nb, sizeof nb, "%d", v);
        txtL(150, y - 7, nb, 8, 13);
    }
    txtL(195, 200, "当前深度", 8, 15);
    txtL(195, 118, "个栈帧同时活着", 0, 15);
    txtL(195, 78, "O(n)", 1, 26);
    txtL(195, -64, "每格 = 25 层", 8, 14);
    txtL(195, -96, "再深就爆栈", 1, 14);
}

// 栈容器作为一个槽位：高度或颜色变了才整体擦重画（壁 +  bar + 格子线 + 刻度线），
// 擦除框 102×382 恰好罩住容器，不碰 x150 的刻度标签和 x195 的文字
void stackBar() {
    double hgt = (g_depth / 500.0) * 380.0;
    if (hgt == lastH && g_up == lastUp) return;
    pen.setAngle(0);
    pen.pu().moveTo(90, 40).pd().clsRec(102, 382);
    pen.pu().moveTo(90, 40).pd().c(8).size(2).r(100, 380, 8);
    if (hgt > 0.5) pen.pu().moveTo(90, -150 + hgt / 2).pd().rr(100, hgt, g_up ? 14 : 1);
    for (int k = 1; k < 20; k++) {
        double y = -150 + k * 19.0;
        pen.c(8);
        seg(40, y, 140, y, 1);
    }
    for (int v = 0; v <= 500; v += 100) {
        double y = -150 + (v / 500.0) * 380.0;
        pen.c(8);
        seg(140, y, 146, y, 1);
    }
    lastH = hgt; lastUp = g_up;
}

// 阶段 2 的两个增长块：c[] 从左往右长、d[] 居中向两边长，新块都包含旧块，
// 不透明原位盖旧即可，不用擦；盖完把块上的文字补写一次
void phase2Dyn() {
    if (g_cN != lastCN) {
        double cw = 140.0 * g_cN / 10000.0;
        pen.setAngle(0);
        if (cw > 1) pen.pu().moveTo(-190 + cw / 2, -240).pd().rr(cw, 40, 3);
        txt(-120, -240, "c[10000]", 0, 14);
        lastCN = g_cN;
    }
    if (g_varN != lastVarN) {
        double dw = 40.0 + 180.0 * (g_varN / 10000.0);
        pen.setAngle(0);
        box(150, -240, dw, 40, "", 14, 6);
        char b[128];
        snprintf(b, sizeof b, "n=%d", g_varN);
        txt(150, -240, b, 0, 14);
        lastVarN = g_varN;
    }
}

// 下半屏：阶段切换时擦一次整块再画该阶段的静态内容；阶段 2 每帧只补动态块
void bottomPhase() {
    if (g_phase == lastPhase) {
        if (g_phase == 2) phase2Dyn();
        return;
    }
    pen.setAngle(0);
    pen.pu().moveTo(-30, -255).pd().clsRec(660, 170);
    if (g_phase == 0) {
        txtL(-350, -190, "loop 里每次调用 func()，返回后栈帧立刻还回去：100 万次也只占常数空间", 0, 16);
        txtL(-350, -224, "栈帧：main → loop → func，func 用完就弹出，所以峰值恒定", 8, 15);
    } else if (g_phase == 1) {
        txtL(-350, -190, "调用链：recur(500) → recur(499) → … → recur(1)，500 个栈帧同时压在栈上", 0, 16);
        txtL(-350, -224, "回溯时一层层弹出，deepest 记下最深的一层 = 500 → O(n)", 8, 15);
    } else {
        txtL(-350, -186, "变量占的空间也分 O(1) 和 O(n)", 0, 17);
        box(-320, -240, 56, 40, "a", 3, 10);
        box(-240, -240, 56, 40, "b", 3, 10);
        box(-120, -240, 140, 40, "", 15, 2);
        txt(-120, -240, "c[10000]", 0, 14);
        box(150, -240, 40, 40, "", 14, 6);
        txt(150, -240, "n=0", 0, 14);
        txt(-320, -274, "a：O(1)", 8, 14);
        txt(-240, -274, "b：O(1)", 8, 14);
        txt(-120, -274, "c[10000]：O(1)", 8, 14);
        txt(150, -274, "d[n]：O(n)", 8, 14);
        txtL(-350, -312, "a、b、c[10000] 长度固定 → O(1)；d = new int[n] 随 n 增长 → O(n)", 0, 16);
        lastCN = 0; lastVarN = 0;
    }
    lastPhase = g_phase;
}

void drawMem() {
    // 左栏：func 栈帧只变颜色/文字，不透明原位盖旧；计数擦槽重画
    if (g_funcIn != lastFuncIn) {
        pen.setAngle(0);
        if (g_funcIn) box(-195, 92, 290, 44, "func 栈帧（正在调用）", 5, 7);
        else box(-195, 92, 290, 44, "func 已返回，栈帧还回去", 15, 8);
        lastFuncIn = g_funcIn;
    }
    if (g_i != lastI) {
        char b[128];
        snprintf(b, sizeof b, "已调用 func() %lld 次", g_i);
        pen.setAngle(0);
        pen.pu().moveTo(-188, 36).pd().clsRec(326, 26);
        txtL(-350, 36, b, 0, 17);
        lastI = g_i;
    }
    stackBar();
    // 右栏动态文字：各自脏跟踪擦槽
    if (g_depth != lastDepth) {
        char b[128];
        snprintf(b, sizeof b, "%d", g_depth);
        pen.setAngle(0);
        pen.pu().moveTo(240, 158).pd().clsRec(100, 44);
        txtL(195, 158, b, 1, 34);
        lastDepth = g_depth;
    }
    if (g_curN != lastCurN) {
        char b[128];
        snprintf(b, sizeof b, "recur(%d)", g_curN);
        pen.setAngle(0);
        pen.pu().moveTo(245, 40).pd().clsRec(110, 26);
        txtL(195, 40, b, 2, 16);
        lastCurN = g_curN;
    }
    if (g_up != lastUpTxt) {
        pen.setAngle(0);
        pen.pu().moveTo(250, 8).pd().clsRec(120, 24);
        txtL(195, 8, g_up ? "正在回溯弹栈" : "正在往下压栈", 8, 14);
        lastUpTxt = g_up;
    }
    if (g_deepest != lastDeepest) {
        char b[128];
        snprintf(b, sizeof b, "deepest = %d", g_deepest);
        pen.setAngle(0);
        pen.pu().moveTo(250, -28).pd().clsRec(120, 24);
        txtL(195, -28, b, 3, 15);
        lastDeepest = g_deepest;
    }
    bottomPhase();
}

// 循环的空间复杂度为 O(1)：每 10 万次画一帧， func 栈帧出现又消失
void loop(int n) {
    for (int i = 0; i < n; i++) {
        g_i = i;
        g_funcIn = 1;
        if (i % 100000 == 0) { drawMem(); wait(0.06); }
        func();
        g_funcIn = 0;
        if (i % 100000 == 0) { drawMem(); wait(0.06); }
    }
    g_i = n;
}

// 递归的空间复杂度为 O(n)：每 50 层画一帧，压栈长高、回溯变矮
int deepest = 0;
int recur(int n) {
    g_curN = n;
    g_depth = 500 - n + 1;
    g_up = 0;
    if ((500 - n) % 50 == 0) { drawMem(); wait(0.12); }
    if (n == 1) { drawMem(); wait(0.22); return 1; }
    int r = recur(n - 1);
    if (n > deepest) deepest = n;    // 一路回溯上来，记下最深的一层
    g_deepest = deepest;
    g_curN = n;
    g_depth = 500 - n + 1;
    g_up = 1;
    if ((500 - n) % 50 == 0) { drawMem(); wait(0.06); }
    return r;
}

int main() {
    pen.speed(10);
    g_phase = 0;
    staticBg();
    drawMem();
    wait(0.3);
    loop(1000000);
    drawMem();
    wait(0.25);

    g_phase = 1; g_depth = 0; g_curN = 500;
    drawMem();
    wait(0.2);
    deepest = 0;
    recur(500);
    g_depth = 0; g_up = 0;
    drawMem();
    wait(0.2);

    // 变量占多少空间也分 O(1) 和 O(n)
    g_phase = 2;
    const int a = 0;             // 暂存数据（常量）
    int b = 0;                   // 暂存数据（变量）
    int c[10000];                // 长度固定，永远 O(1)
    for (int i = 0; i < 10000; i++) {
        c[i] = 0;
        if (i % 2000 == 0) { g_cN = i; drawMem(); wait(0.08); }
    }
    g_cN = 10000;
    const int n = 10000;
    int* d = new int[n];         // 长度随 n 变，就是 O(n)
    for (int i = 0; i < n; i++) {
        d[i] = 0;
        if (i % 2000 == 0) { g_varN = i; drawMem(); wait(0.1); }
    }
    g_varN = n;
    drawMem();
    wait(0.5);
    printf("循环 1000000 次栈帧恒为 3 → O(1)；递归 500 层最深 %d → O(n)；a=%d b=%d c[0]=%d d[9999]=%d，c 是 O(1)、d 是 O(n)。\\n",
           deepest, a, b, c[0], d[9999]);
    delete[] d;
    return 0;
}
`,
  },
  '01 背包（一维滚动数组）（画图版）': {
    group: 'GoC 可视化·动态规划',
    stdin: '',
    code: `// 01 背包（一维滚动数组，局部重绘）：静态背景只画一次；dp 格子脏跟踪，
// 值/颜色变了才 setAngle(0)+clsRec 擦槽重画；来源连线换帧先擦旧走廊再画新线，不整屏 cls。
// 颜色约定：黄格=正在处理的容量 c；绿线/绿字=本次更新成功；红线=舍弃(不更优)；
// 橙框=来源格 dp[c-w]；倒推被选中的物品卡片标绿。容量逆序枚举，避免重复放入。
#include <goc.h>
#include <cstdio>
#include <cstring>
#include <string>

const int N = 5, CAP = 12;
int w[N] = {2, 3, 4, 5, 9};
int v[N] = {3, 4, 5, 8, 10};
const char* nm[N] = {"A", "B", "C", "D", "E"};
int dp[CAP + 1], pick[N][CAP + 1];
int itemState[N];              // 0 普通 1 当前 2 已选
int curItem = -1, curC = -1, srcC = -1, bestC = -1;
int linkCol = 3, cellUp = 0;
bool showLink = false;
std::string msg = "";

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

// 来源格 -> 当前格 的弧形连线（抛物线拱形）
void conn(double x1, double x2, double yb, double yp, int col) {
    pen.c(col);
    double px = x1, py = yb;
    for (int k = 1; k <= 14; k++) {
        double t = (double)k / 14.0;
        double x = x1 + (x2 - x1) * t;
        double y = yb + (yp - yb) * (4.0 * t * (1.0 - t));
        seg(px, py, x, y, 3);
        px = x; py = y;
    }
}

double cellX(int c) { return -324.0 + c * 54.0; }

// ---- 局部重绘用的脏跟踪状态 ----
int lastCard[N];                        // 上次卡片颜色
int lastKey[CAP + 1], lastVal[CAP + 1]; // 上次格子的「配色键」和数值
int lastCur = -2;                       // 上次「当前物品」下标
int lastLkey = -1;                      // 上次来源连线的键（-1 = 没画）
double lastLcx = 0, lastLw = 0;         // 上次连线走廊的中心 x / 宽
bool msgInit = false;
std::string lastMsg = "";

// dp 行标题：静态，但会被连线走廊擦到，所以擦完要补画
void dpLabel() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, -185).pd().c(0).textL("dp[0..12]：容量 0..12 的最大价值", 0, 16);
}

// 静态背景只画一次：标题、右侧图例、dp 标题、容量下标（都在动态槽位之外）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("01 背包（一维滚动数组）", 0, 26);
    pen.pu().moveTo(-350, 302).pd().c(8).textL("dp[c]=max(dp[c], dp[c-w]+v)，容量 c 逆序枚举", 0, 14);
    pen.pu().moveTo(120, 240).pd().c(0).textL("当前物品", 0, 16);
    pen.pu().moveTo(120, 150).pd().c(3).textL("绿线/绿字 = 更新成功", 0, 14);
    pen.pu().moveTo(120, 124).pd().c(1).textL("红线 = 舍弃(不更优)", 0, 14);
    pen.pu().moveTo(120, 98).pd().c(5).textL("黄格 = 正在处理", 0, 14);
    dpLabel();
    for (int c = 0; c <= CAP; c++)
        pen.pu().moveTo(cellX(c), -292).pd().c(8).text(c, 0, 13);
}

// 物品卡片：槽距 52、擦 48 高，既不碰上下邻居也不碰标题
void drawCard(int i) {
    double y = 235.0 - i * 52.0;
    int col = itemState[i] == 1 ? 5 : (itemState[i] == 2 ? 3 : 2);
    if (col == lastCard[i]) return;
    pen.setAngle(0);
    pen.pu().moveTo(-245, y).pd().clsRec(224, 48);
    pen.pu().moveTo(-245, y).pd().c(col).size(3).rr(220, 44);
    pen.pu().moveTo(-340, y).pd().c(0).textL(std::string(nm[i]) + "  w=" + S(w[i]) + "  v=" + S(v[i]), 0, 18);
    lastCard[i] = col;
}

void drawCur() {
    if (curItem == lastCur) return;
    pen.setAngle(0);
    pen.pu().moveTo(270, 208).pd().clsRec(310, 30);
    if (curItem >= 0)
        pen.pu().moveTo(120, 208).pd().c(5).textL(std::string(nm[curItem]) + " (w=" + S(w[curItem]) + ", v=" + S(v[curItem]) + ")", 0, 20);
    lastCur = curItem;
}

// dp 格子：槽距 54、擦 52 宽；擦 -281..-219，盖住格子描边但不碰容量下标(-292)和连线走廊(-217.5 起)
void drawCell(int c) {
    double x = cellX(c);
    int fill = (c == curC) ? 5 : (c == bestC ? 3 : -1);
    int vc = (c == curC && cellUp) ? 3 : 0;
    int sc = (c == srcC) ? 1 : 0;
    int key = (fill + 1) * 100 + vc * 10 + sc;
    if (key == lastKey[c] && dp[c] == lastVal[c]) return;
    pen.setAngle(0);
    pen.pu().moveTo(x, -250).pd().clsRec(52, 62);
    pen.pu().moveTo(x, -250).pd().c(2).size(2);
    if (fill >= 0) pen.rr(50, 58, fill); else pen.r(50, 58);
    if (sc) { pen.pu().moveTo(x, -250).pd().c(14).size(3).r(50, 58); }
    pen.pu().moveTo(x, -250).pd().c(vc).text(dp[c], 0, 20);
    lastKey[c] = key; lastVal[c] = dp[c];
}

void render() {
    // 1) 来源连线换帧：先擦旧走廊（会擦到 dp 标题，随后补画），再画新线
    bool nowShow = showLink && curC >= 0 && srcC >= 0;
    int lkey = nowShow ? (srcC * 16 + curC) * 4 + linkCol : -1;
    if (lkey != lastLkey) {
        if (lastLkey >= 0) {
            pen.setAngle(0);
            pen.pu().moveTo(lastLcx, -182.5).pd().clsRec(lastLw, 70);
            dpLabel();
        }
        if (nowShow) {
            double x1 = cellX(srcC), x2 = cellX(curC);
            lastLcx = (x1 + x2) / 2.0;
            lastLw = fabs(x2 - x1) + 8.0;
            conn(x1, x2, -215, -150, linkCol);
        }
        lastLkey = lkey;
    }
    // 2) 只重画状态变了的卡片 / 当前物品 / dp 格子
    for (int i = 0; i < N; i++) drawCard(i);
    drawCur();
    for (int c = 0; c <= CAP; c++) drawCell(c);
    // 3) 底部说明文字
    if (!msgInit || msg != lastMsg) {
        pen.setAngle(0);
        pen.pu().moveTo(0, -345).pd().clsRec(710, 28);
        pen.pu().moveTo(-350, -345).pd().c(0).textL(msg, 0, 16);
        lastMsg = msg; msgInit = true;
    }
}

int main() {
    pen.speed(10);
    memset(dp, 0, sizeof dp);
    memset(pick, 0, sizeof pick);
    for (int i = 0; i < N; i++) itemState[i] = 0;
    for (int i = 0; i < N; i++) lastCard[i] = -1;
    for (int c = 0; c <= CAP; c++) { lastKey[c] = -1; lastVal[c] = -1; }
    staticBg();
    msg = "初始 dp 全 0，依次放入物品 A..E";
    render(); wait(0.5);
    for (int i = 0; i < N; i++) {
        curItem = i; itemState[i] = 1;
        curC = -1; srcC = -1; showLink = false;
        msg = "放入物品 " + std::string(nm[i]) + "：c 从 " + S(CAP) + " 逆序到 " + S(w[i]);
        render(); wait(0.3);
        for (int c = CAP; c >= w[i]; c--) {
            int src = c - w[i];
            int cand = dp[src] + v[i];
            int old = dp[c];
            bool up = cand > old;
            if (up) { dp[c] = cand; pick[i][c] = 1; }
            curC = c; srcC = src; showLink = true;
            linkCol = up ? 3 : 1; cellUp = up ? 1 : 0;
            msg = "c=" + S(c) + ": dp[" + S(src) + "]+" + S(v[i]) + "=" + S(cand) + (up ? " > " : " <= ") + S(old) + (up ? "，更新" : "，舍弃");
            render(); wait(0.05);
        }
        itemState[i] = 0;
    }
    curItem = -1; curC = -1; srcC = -1; showLink = false;
    // 倒着按 pick 表还原选了哪些物品
    int c = CAP;
    std::string chosen = "";
    for (int i = N - 1; i >= 0; i--) {
        if (pick[i][c]) {
            itemState[i] = 2;
            chosen = std::string(nm[i]) + " " + chosen;
            msg = "倒推：选物品 " + std::string(nm[i]) + "，剩余容量 " + S(c - w[i]);
            render(); wait(0.35);
            c -= w[i];
        }
    }
    bestC = CAP; cellUp = 1;
    msg = "最优值 = " + S(dp[CAP]) + "，选取 " + chosen + "（总重 " + S(CAP - c) + "）";
    render(); wait(0.8);
    printf("01背包: 最大价值=%d, 选取 %s\\n", dp[CAP], chosen.c_str());
    return 0;
}
`,
  },
  '完全背包 + 零钱兑换（画图版）': {
    group: 'GoC 可视化·动态规划',
    stdin: '',
    code: `// 完全背包 + 零钱兑换（局部重绘）：顶部硬币面额 + 两行 dp（best 最大金额 / cnt 最少枚数）。
// 静态背景只画一次；硬币/格子脏跟踪，变了才 setAngle(0)+clsRec 擦槽重画；
// 来源连线换帧先擦旧走廊（会擦到行标题和格子顶边，擦完补画标题并把受影响格子标脏）。
// 颜色约定：黄格=正在处理；绿线=更新；红线=舍弃；橙框=来源格。
// 与 01 背包对比：这里容量正序枚举，同一枚硬币可重复用。最后画出凑 11 的组合。
#include <goc.h>
#include <cstdio>
#include <cstring>
#include <string>

const int CAP = 11, NC = 3, INF = 1000000;
int coin[NC] = {1, 3, 4};
int best[CAP + 1], cnt[CAP + 1], first[CAP + 1];
int coinState[NC];
int curRow = -1, curC = -1, srcC = -1, linkCol = 3, cellUp = 0;
bool showLink = false;
int comboN = 0, combo[16], comboShow = 0;
std::string msg = "";

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

void conn(double x1, double x2, double yb, double yp, int col) {
    pen.c(col);
    double px = x1, py = yb;
    for (int k = 1; k <= 12; k++) {
        double t = (double)k / 12.0;
        double x = x1 + (x2 - x1) * t;
        double y = yb + (yp - yb) * (4.0 * t * (1.0 - t));
        seg(px, py, x, y, 3);
        px = x; py = y;
    }
}

double cellX(int c) { return -319.0 + c * 58.0; }
double rowY(int row) { return row == 0 ? 60.0 : -120.0; }

// ---- 局部重绘用的脏跟踪状态 ----
int lastCoin[NC];
int lastKey[2][CAP + 1], lastVal[2][CAP + 1];
int lastLkey = -1, lastLrow = 0;
double lastLcx = 0, lastLw = 0, lastLcy = 0;
int lastCombo = -1;
bool msgInit = false;
std::string lastMsg = "";

// 行标题：静态，但会被连线走廊擦到，擦完要补画
void rowLabel(int row) {
    pen.setAngle(0);
    if (row == 0)
        pen.pu().moveTo(-350, 102).pd().c(0).textL("完全背包 best[c]：容量 c 能凑到的最大金额", 0, 15);
    else
        pen.pu().moveTo(-350, -78).pd().c(0).textL("零钱兑换 cnt[c]：凑出 c 的最少枚数（- 表示暂不可达）", 0, 15);
}

void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("完全背包 + 零钱兑换", 0, 26);
    pen.pu().moveTo(-350, 302).pd().c(8).textL("正序更新：同一枚可重复用（对比 01 背包的逆序）", 0, 14);
    pen.pu().moveTo(-350, 268).pd().c(0).textL("硬币面额（每种无限枚）", 0, 15);
    rowLabel(0); rowLabel(1);
    for (int row = 0; row < 2; row++)
        for (int c = 0; c <= CAP; c++)
            pen.pu().moveTo(cellX(c), rowY(row) - 34).pd().c(8).text(c, 0, 12);
}

// 硬币：槽距 90、擦 60 宽，上边不碰「硬币面额」标题(y=268)
void drawCoin(int i) {
    double x = -280.0 + i * 90.0;
    int col = coinState[i] == 1 ? 5 : 2;
    if (col == lastCoin[i]) return;
    pen.setAngle(0);
    pen.pu().moveTo(x, 225).pd().clsRec(60, 60);
    pen.pu().moveTo(x, 225).pd().c(col).size(3).oo(26);
    pen.pu().moveTo(x, 225).pd().c(0).text(coin[i], 0, 20);
    lastCoin[i] = col;
}

// dp 格子：槽距 58、擦 54 宽 50 高；下边不碰容量下标(y-34)，上边不碰行标题(y+42)
void drawCell(int row, int c) {
    double x = cellX(c), y = rowY(row);
    bool active = (curRow == row);
    int fill = (active && c == curC) ? 5 : -1;
    int vc = (active && c == curC && cellUp) ? 3 : 0;
    int sc = (active && c == srcC) ? 1 : 0;
    int key = (fill + 1) * 100 + vc * 10 + sc;
    int val = row == 0 ? best[c] : cnt[c];
    if (key == lastKey[row][c] && val == lastVal[row][c]) return;
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().clsRec(54, 50);
    pen.pu().moveTo(x, y).pd().c(2).size(2);
    if (fill >= 0) pen.rr(52, 46, fill); else pen.r(52, 46);
    if (sc) { pen.pu().moveTo(x, y).pd().c(14).size(3).r(52, 46); }
    std::string vs = (row == 1 && val >= INF) ? std::string("-") : S(val);
    pen.pu().moveTo(x, y).pd().c(vc).text(vs, 0, 18);
    lastKey[row][c] = key; lastVal[row][c] = val;
}

// 走廊擦到的格子顶边要补：把它们标脏，下一轮 drawCell 会重画
void touchRow(int row, double xmin, double xmax) {
    for (int c = 0; c <= CAP; c++)
        if (cellX(c) + 27.0 > xmin && cellX(c) - 27.0 < xmax) lastKey[row][c] = -1;
}

// 组合区：整块槽位一次擦净（y -320..-210，不碰容量下标和底部 msg）
void drawCombo() {
    if (comboShow == lastCombo) return;
    pen.setAngle(0);
    pen.pu().moveTo(0, -265).pd().clsRec(760, 110);
    if (comboShow > 0) {
        pen.pu().moveTo(-350, -235).pd().c(0).textL("凑出 11 的一种最优组合（最少 " + S(comboN) + " 枚）：", 0, 16);
        double x = -300;
        for (int k = 0; k < comboShow; k++) {
            pen.pu().moveTo(x, -290).pd().c(3).size(3).oo(26);
            pen.pu().moveTo(x, -290).pd().c(0).text(combo[k], 0, 20);
            if (k + 1 < comboShow) pen.pu().moveTo(x + 40, -290).pd().c(0).text("+", 0, 20);
            x += 80;
        }
        pen.pu().moveTo(x + 10, -290).pd().c(0).textL("= 11", 0, 20);
    }
    lastCombo = comboShow;
}

void render() {
    // 1) 连线换帧：擦旧走廊 + 补画被擦到的行标题 + 把顶边被擦的格子标脏
    bool nowShow = showLink && curC >= 0 && srcC >= 0 && curRow >= 0;
    int lkey = nowShow ? (curRow * 256 + srcC * 16 + curC) * 4 + linkCol : -1;
    if (lkey != lastLkey) {
        if (lastLkey >= 0) {
            pen.setAngle(0);
            pen.pu().moveTo(lastLcx, lastLcy).pd().clsRec(lastLw, 40);
            rowLabel(lastLrow);
            touchRow(lastLrow, lastLcx - lastLw / 2.0, lastLcx + lastLw / 2.0);
        }
        lastLkey = lkey;
    }
    // 2) 只重画状态变了的硬币和格子
    for (int i = 0; i < NC; i++) drawCoin(i);
    for (int row = 0; row < 2; row++)
        for (int c = 0; c <= CAP; c++) drawCell(row, c);
    // 3) 连线画在格子之上，每帧补一遍，避免被格子擦槽削掉端点
    if (nowShow) {
        double y = rowY(curRow);
        double x1 = cellX(srcC), x2 = cellX(curC);
        lastLcx = (x1 + x2) / 2.0;
        lastLw = fabs(x2 - x1) + 8.0;
        lastLcy = y + 41.0;
        lastLrow = curRow;
        conn(x1, x2, y + 26, y + 56, linkCol);
    }
    drawCombo();
    if (!msgInit || msg != lastMsg) {
        pen.setAngle(0);
        pen.pu().moveTo(0, -350).pd().clsRec(710, 26);
        pen.pu().moveTo(-350, -350).pd().c(0).textL(msg, 0, 15);
        lastMsg = msg; msgInit = true;
    }
}

int main() {
    pen.speed(10);
    memset(best, 0, sizeof best);
    for (int c = 0; c <= CAP; c++) { cnt[c] = INF; first[c] = -1; }
    cnt[0] = 0;
    for (int i = 0; i < NC; i++) coinState[i] = 0;
    for (int i = 0; i < NC; i++) lastCoin[i] = -1;
    for (int row = 0; row < 2; row++)
        for (int c = 0; c <= CAP; c++) { lastKey[row][c] = -1; lastVal[row][c] = -1; }
    staticBg();
    msg = "完全背包：正序枚举容量，best[c] 记录能凑到的最大金额";
    render(); wait(0.5);
    // 完全背包：正序更新 best
    for (int i = 0; i < NC; i++) {
        coinState[i] = 1; curRow = 0; curC = -1; srcC = -1; showLink = false;
        msg = "用面额 " + S(coin[i]) + " 正序更新 best";
        render(); wait(0.25);
        for (int c = coin[i]; c <= CAP; c++) {
            int src = c - coin[i];
            int cand = best[src] + coin[i];
            int old = best[c];
            bool up = cand > old;
            if (up) best[c] = cand;
            curC = c; srcC = src; showLink = true; linkCol = up ? 3 : 1; cellUp = up ? 1 : 0;
            msg = "best[" + S(c) + "] = max(" + S(old) + ", best[" + S(src) + "]+" + S(coin[i]) + "=" + S(cand) + ")";
            render(); wait(0.04);
        }
        coinState[i] = 0;
    }
    // 零钱兑换：正序更新 cnt
    curRow = 1; curC = -1; srcC = -1; showLink = false;
    msg = "零钱兑换：正序更新 cnt，求最少枚数";
    render(); wait(0.4);
    for (int i = 0; i < NC; i++) {
        coinState[i] = 1; curRow = 1; curC = -1; srcC = -1; showLink = false;
        msg = "用面额 " + S(coin[i]) + " 正序更新 cnt";
        render(); wait(0.25);
        for (int c = coin[i]; c <= CAP; c++) {
            int src = c - coin[i];
            int cand = cnt[src] + 1;
            int old = cnt[c];
            bool up = cand < old;
            if (up) { cnt[c] = cand; first[c] = coin[i]; }
            curC = c; srcC = src; showLink = true; linkCol = up ? 3 : 1; cellUp = up ? 1 : 0;
            std::string candS = (cnt[src] >= INF ? std::string("-") : S(cand));
            msg = "cnt[" + S(c) + "] = min(" + (old >= INF ? std::string("-") : S(old)) + ", cnt[" + S(src) + "]+1=" + candS + ")";
            render(); wait(0.04);
        }
        coinState[i] = 0;
    }
    // 回溯 first[] 画出凑 11 的组合
    curRow = -1; curC = -1; srcC = -1; showLink = false;
    int c = CAP; comboN = 0;
    while (c > 0) { combo[comboN++] = first[c]; c -= first[c]; }
    for (int k = 0; k < comboN; k++) {
        comboShow = k + 1;
        msg = "回溯 first[]：依次取出面额 " + S(combo[k]);
        render(); wait(0.35);
    }
    msg = "凑 11 最少 " + S(comboN) + " 枚；best 全等于金额说明都能凑齐";
    render(); wait(0.7);
    printf("完全背包+零钱兑换: 凑11最少%d枚\\n", comboN);
    return 0;
}
`,
  },
  '最长公共子序列 LCS（二维 dp）（画图版）': {
    group: 'GoC 可视化·动态规划',
    stdin: '',
    code: `// 最长公共子序列 LCS（二维 dp，局部重绘）：两个串标在行列外侧，逐格填表。
// 静态背景（标题/行列字符）只画一次；格子脏跟踪，变了才 setAngle(0)+clsRec 擦槽重画；
// 三条来源线换帧先擦旧走廊，再把被擦到的 2x2 格子标脏补画，最后画新线，不整屏 cls。
// 颜色约定：黄格=正在填；绿线=选中的来源(相等取对角，否则取上/左较大者)；
// 灰线=另两个来源；填完回溯路径标绿并还原一个 LCS。
#include <goc.h>
#include <cstdio>
#include <cstring>
#include <string>

const char* A = "ABCBDAB";
const char* B = "BDCABA";
int n, m;
int dp[16][16];
bool filled[16][16], path[16][16];
int curI = -1, curJ = -1, srcType = 0;   // 1 对角 2 上 3 左
std::string lcs = "";
std::string msg = "";

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }
std::string CH(char c) { char b[2] = {c, 0}; return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

double cx(int j) { return -210.0 + j * 70.0; }
double cy(int i) { return 185.0 - i * 50.0; }

// ---- 局部重绘用的脏跟踪状态 ----
int lastKey[16][16], lastVal[16][16];
bool corrHas = false;
double corrX = 0, corrY = 0;
int corrI = 0, corrJ = 0;
bool msgInit = false, lcsInit = false;
std::string lastMsg = "", lastLcs = "";

// 静态背景只画一次：标题 + 行列字符（都在格子槽位之外）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("最长公共子序列 LCS（二维 dp）", 0, 26);
    pen.pu().moveTo(-350, 300).pd().c(8).textL("相等取对角+1，否则取上/左较大者；回溯标绿", 0, 14);
    for (int j = 0; j <= m; j++) {
        std::string s = j == 0 ? std::string("-") : CH(B[j - 1]);
        pen.pu().moveTo(cx(j), 232).pd().c(2).text(s, 0, 18);
    }
    for (int i = 0; i <= n; i++) {
        std::string s = i == 0 ? std::string("-") : CH(A[i - 1]);
        pen.pu().moveTo(-285, cy(i)).pd().c(2).text(s, 0, 18);
    }
}

// 格子：横向槽距 70 擦 68、纵向槽距 50 擦 48，正好不碰邻居/行列字符
void drawCell(int i, int j) {
    double x = cx(j), y = cy(i);
    bool isCur = (i == curI && j == curJ);
    bool isPath = path[i][j];
    int col = isPath ? 3 : (isCur ? 5 : (filled[i][j] ? 2 : 8));
    bool showText = filled[i][j] || i == 0 || j == 0;
    int key = col * 2 + (showText ? 1 : 0);
    if (key == lastKey[i][j] && dp[i][j] == lastVal[i][j]) return;
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().clsRec(70, 50);
    pen.pu().moveTo(x, y).pd().c(col).size(2);
    if (isCur || isPath) pen.rr(66, 46, col); else pen.r(66, 46);
    if (showText)
        pen.pu().moveTo(x, y).pd().c(isPath ? 15 : 0).text(dp[i][j], 0, 18);
    lastKey[i][j] = key; lastVal[i][j] = dp[i][j];
}

// 来源线走廊会盖住 (i,j) 左上那块 2x2，擦完把这 4 个格子标脏
void touchBlock(int i, int j) {
    for (int di = 0; di <= 1; di++) for (int dj = 0; dj <= 1; dj++) {
        int a = i - di, b = j - dj;
        if (a >= 0 && b >= 0 && a <= n && b <= m) lastKey[a][b] = -1;
    }
}

void render() {
    // 1) 来源线换帧：擦旧走廊 + 把被擦到的格子标脏
    bool nowShow = (curI > 0 && curJ > 0);
    if (nowShow != corrHas || (nowShow && (curI != corrI || curJ != corrJ))) {
        if (corrHas) {
            pen.setAngle(0);
            pen.pu().moveTo(corrX, corrY).pd().clsRec(80, 60);
            touchBlock(corrI, corrJ);
        }
        corrHas = nowShow; corrI = curI; corrJ = curJ;
        if (nowShow) { corrX = cx(curJ) - 35.0; corrY = cy(curI) + 25.0; }
    }
    // 2) 只重画状态变了的格子
    for (int i = 0; i <= n; i++) for (int j = 0; j <= m; j++) drawCell(i, j);
    // 3) 三条来源线画在格子之上，每帧补一遍
    if (nowShow) {
        double x = cx(curJ), y = cy(curI);
        pen.c(srcType == 1 ? 3 : 8); seg(cx(curJ - 1), cy(curI - 1), x, y, 3);
        pen.c(srcType == 2 ? 3 : 8); seg(cx(curJ), cy(curI - 1), x, y, 3);
        pen.c(srcType == 3 ? 3 : 8); seg(cx(curJ - 1), cy(curI), x, y, 3);
    }
    if (!msgInit || msg != lastMsg) {
        pen.setAngle(0);
        pen.pu().moveTo(0, -235).pd().clsRec(710, 26);
        pen.pu().moveTo(-350, -235).pd().c(0).textL(msg, 0, 15);
        lastMsg = msg; msgInit = true;
    }
    if (!lcsInit || lcs != lastLcs) {
        pen.setAngle(0);
        pen.pu().moveTo(0, -275).pd().clsRec(710, 30);
        if (lcs.size())
            pen.pu().moveTo(-350, -275).pd().c(3).textL("LCS = " + lcs + "  (长度 " + S((int)lcs.size()) + ")", 0, 18);
        lastLcs = lcs; lcsInit = true;
    }
}

int main() {
    pen.speed(10);
    n = (int)strlen(A); m = (int)strlen(B);
    memset(dp, 0, sizeof dp);
    memset(filled, 0, sizeof filled);
    memset(path, 0, sizeof path);
    for (int i = 0; i <= n; i++) filled[i][0] = true;
    for (int j = 0; j <= m; j++) filled[0][j] = true;
    for (int i = 0; i < 16; i++) for (int j = 0; j < 16; j++) { lastKey[i][j] = -1; lastVal[i][j] = -1; }
    staticBg();
    msg = "初始化：第 0 行/列全 0（空串）";
    render(); wait(0.5);
    for (int i = 1; i <= n; i++) for (int j = 1; j <= m; j++) {
        if (A[i - 1] == B[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; srcType = 1; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) { dp[i][j] = dp[i - 1][j]; srcType = 2; }
        else { dp[i][j] = dp[i][j - 1]; srcType = 3; }
        filled[i][j] = true; curI = i; curJ = j;
        msg = CH(A[i - 1]) + (A[i - 1] == B[j - 1] ? "==" : "!=") + CH(B[j - 1]) + "  dp[" + S(i) + "][" + S(j) + "]=" + S(dp[i][j]);
        render(); wait(0.045);
    }
    curI = -1; curJ = -1;
    // 从右下角往回走，还原一个具体的子序列
    int i = n, j = m;
    std::string rev = "";
    msg = "从右下角回溯，绿色为路径";
    render(); wait(0.3);
    while (i > 0 && j > 0) {
        path[i][j] = true;
        if (A[i - 1] == B[j - 1]) { rev += A[i - 1]; i--; j--; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
        else j--;
        render(); wait(0.18);
    }
    path[0][0] = true;
    for (int k = (int)rev.size() - 1; k >= 0; k--) lcs += rev[k];
    msg = "回溯完成";
    render(); wait(0.8);
    printf("LCS: 长度=%d, 一个LCS=%s\\n", dp[n][m], lcs.c_str());
    return 0;
}
`,
  },
  '最长上升子序列 LIS 与方案还原（画图版）': {
    group: 'GoC 可视化·动态规划',
    stdin: '',
    code: `// 最长上升子序列 LIS 与方案还原（局部重绘）：柱子=数组，动画演示 dp[i]（检查所有 j<i）。
// 静态背景（标题/地平线/下标）只画一次；柱子只变颜色、几何不变，直接原位不透明覆盖；
// dp 小格脏跟踪擦槽重画；连线换帧先擦旧走廊，再补地平线并把被擦到的柱子标脏，不整屏 cls。
// 颜色约定：黄柱=当前 i；橙柱=正在检查的 j；绿线=接受(a[j]<a[i] 且更优)；
// 红线=不满足；最长链标绿，最后沿 pre[] 还原一条具体上升子序列。
#include <goc.h>
#include <cstdio>
#include <cstring>
#include <string>

const int N = 10;
int a[N] = {2, 5, 1, 7, 3, 4, 8, 6, 9, 0};
int dp[N], pre[N];
bool chain[N];
int curI = -1, curJ = -1, linkCol = 8, bestLen = 1, bestEnd = 0;
std::string msg = "";
std::string ans = "";
const double BASE = -180.0;

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

double bx(int i) { return -324.0 + i * 72.0; }

// ---- 局部重绘用的脏跟踪状态 ----
int lastBarCol[N];                 // 柱子只变颜色，记上次颜色即可
int lastDpKey[N], lastDpVal[N];    // dp 小格的配色键 + 数值
int lastLkey = -1;
double corrX = 0, corrY = 0, corrW = 0, corrH = 0;
bool msgInit = false, ansInit = false;
std::string lastMsg = "", lastAns = "";

// 静态背景只画一次：地平线正好在柱底，下标在 dp 小格下方，都躲开动态槽位
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("最长上升子序列 LIS 与方案还原", 0, 26);
    pen.pu().moveTo(-350, 300).pd().c(8).textL("dp[i]=以 a[i] 结尾的 LIS 长度，pre[i] 记前驱", 0, 14);
    pen.c(8); seg(-360, BASE, 360, BASE, 2);
    for (int i = 0; i < N; i++)
        pen.pu().moveTo(bx(i), -268).pd().c(8).text(i, 0, 12);
}

// 柱子：几何永远不变（a[] 不动），只有颜色变 -> 先擦自己的槽（柱身+顶标）再原位重画，
// 走廊擦剩的标签碎边一次擦净；0 值给 4px 矮脚，顶标数字不再悬空像残影
void drawBar(int i) {
    double x = bx(i), h = a[i] * 28.0;
    if (h < 4.0) h = 4.0;
    int col = chain[i] ? 3 : (i == curI ? 5 : (i == curJ ? 14 : 2));
    if (col == lastBarCol[i]) return;
    pen.setAngle(0);
    pen.pu().moveTo(x, BASE + 1 + (h + 23) / 2).pd().clsRec(60, h + 23);
    pen.pu().moveTo(x, BASE + h / 2).pd().c(col).size(2).rr(54, h);   // rr 以笔尖为中心，笔尖放半高才是底对齐
    pen.pu().moveTo(x, BASE + h + 16).pd().c(0).text(a[i], 0, 16);
    lastBarCol[i] = col;
}

// dp 小格：槽距 72、擦 50 宽 34 高，下边不碰下标(-268)，上边不碰地平线(-180)
void drawDp(int i) {
    double x = bx(i);
    int dc = (i == curI) ? 5 : 2;
    int key = dc;
    if (key == lastDpKey[i] && dp[i] == lastDpVal[i]) return;
    pen.setAngle(0);
    pen.pu().moveTo(x, -235).pd().clsRec(50, 34);
    pen.pu().moveTo(x, -235).pd().c(dc).size(2).r(46, 30);
    pen.pu().moveTo(x, -235).pd().c(0).text(dp[i], 0, 16);
    lastDpKey[i] = key; lastDpVal[i] = dp[i];
}

// 走廊擦到的柱子（含顶部数字）标脏，让它们原位覆盖回来
void touchBars(double xmin, double xmax) {
    for (int i = 0; i < N; i++)
        if (bx(i) + 30.0 > xmin && bx(i) - 30.0 < xmax) lastBarCol[i] = -1;
}

// 走廊压到地平线时，只补被擦掉的那一段（随后柱子会盖回自己脚下那截）
void repairBase(double xmin, double xmax) {
    double a0 = xmin < -360.0 ? -360.0 : xmin;
    double a1 = xmax > 360.0 ? 360.0 : xmax;
    if (a1 > a0) { pen.c(8); seg(a0, BASE, a1, BASE, 2); }
}

void render() {
    // 1) 检查连线换帧：擦旧走廊 -> 补地平线 -> 把被擦到的柱子标脏
    bool nowShow = (curI >= 0 && curJ >= 0);
    int lkey = nowShow ? (curI * 16 + curJ) * 4 + linkCol : -1;
    if (lkey != lastLkey) {
        if (lastLkey >= 0) {
            double xmin = corrX - corrW / 2.0, xmax = corrX + corrW / 2.0;
            pen.setAngle(0);
            pen.pu().moveTo(corrX, corrY).pd().clsRec(corrW, corrH);
            if (corrY - corrH / 2.0 <= BASE + 2.0) repairBase(xmin, xmax);
            touchBars(xmin, xmax);
        }
        lastLkey = lkey;
    }
    // 2) 只重画颜色变了的柱子 / 状态变了的 dp 小格
    for (int i = 0; i < N; i++) drawBar(i);
    for (int i = 0; i < N; i++) drawDp(i);
    // 3) 连线画在柱子之上，每帧补一遍
    if (nowShow) {
        double x1 = bx(curJ), y1 = BASE + a[curJ] * 28.0;
        double x2 = bx(curI), y2 = BASE + a[curI] * 28.0;
        corrX = (x1 + x2) / 2.0; corrY = (y1 + y2) / 2.0;
        corrW = fabs(x2 - x1) + 8.0; corrH = fabs(y2 - y1) + 8.0;
        pen.c(linkCol); seg(x1, y1, x2, y2, 3);
    }
    pen.c(3);
    for (int i = 0; i < N; i++)
        if (chain[i] && pre[i] >= 0 && chain[pre[i]])
            seg(bx(pre[i]), BASE + a[pre[i]] * 28.0, bx(i), BASE + a[i] * 28.0, 3);
    if (!msgInit || msg != lastMsg) {
        pen.setAngle(0);
        pen.pu().moveTo(0, -320).pd().clsRec(710, 26);
        pen.pu().moveTo(-350, -320).pd().c(0).textL(msg, 0, 15);
        lastMsg = msg; msgInit = true;
    }
    if (!ansInit || ans != lastAns) {
        pen.setAngle(0);
        pen.pu().moveTo(0, -355).pd().clsRec(710, 30);
        if (ans.size())
            pen.pu().moveTo(-350, -355).pd().c(3).textL("一条 LIS：" + ans, 0, 18);
        lastAns = ans; ansInit = true;
    }
}

int main() {
    pen.speed(10);
    for (int i = 0; i < N; i++) { dp[i] = 1; pre[i] = -1; chain[i] = false; }
    for (int i = 0; i < N; i++) { lastBarCol[i] = -1; lastDpKey[i] = -1; lastDpVal[i] = -1; }
    staticBg();
    msg = "dp[i] 初始全 1，逐个检查 j<i";
    render(); wait(0.4);
    for (int i = 0; i < N; i++) {
        curI = i; curJ = -1;
        for (int j = 0; j < i; j++) {
            curJ = j;
            bool ok = a[j] < a[i];
            int cand = dp[j] + 1;
            bool up = ok && cand > dp[i];
            linkCol = up ? 3 : (ok ? 14 : 1);
            if (up) { dp[i] = cand; pre[i] = j; }
            msg = "i=" + S(i) + ": 检查 j=" + S(j) + (ok ? " (a[j]<a[i])" : " (a[j]>=a[i] 跳过)") + (up ? "，dp[i]=" + S(dp[i]) : "");
            render(); wait(0.04);
        }
        curJ = -1;
        if (dp[i] > bestLen) { bestLen = dp[i]; bestEnd = i; }
        msg = "dp[" + S(i) + "]=" + S(dp[i]);
        render(); wait(0.06);
    }
    curI = -1; curJ = -1;
    // 沿 pre[] 倒着走，把最长链标绿
    int p = bestEnd;
    while (p != -1) { chain[p] = true; render(); wait(0.3); p = pre[p]; }
    int tmp[16], k = 0;
    for (int q = bestEnd; q != -1; q = pre[q]) tmp[k++] = a[q];
    ans = "";
    for (int t = k - 1; t >= 0; t--) { ans += S(tmp[t]); if (t) ans += " "; }
    msg = "最长链标绿，长度 " + S(bestLen);
    render(); wait(0.8);
    printf("LIS: 长度=%d, 一条LIS=%s\\n", bestLen, ans.c_str());
    return 0;
}
`,
  },
  '编辑距离（二维 dp）（画图版）': {
    group: 'GoC 可视化·动态规划',
    stdin: '',
    code: `// 编辑距离（二维 dp，局部重绘）：逐格填表，显示 插入/删除/替换 三个来源的最小值选择。
// 静态背景（标题/行列字符）只画一次；格子脏跟踪擦槽重画；三条来源线换帧先擦旧走廊，
// 再把被擦到的 2x2 格子标脏补画；操作序列只追加新行，不整屏 cls。
// 颜色约定：黄格=正在填；绿线=选中的来源；灰线=另两个来源；回溯路径标绿。
// 字符相同取对角(免费)，否则 1+min(删=上, 插=左, 替=对角)。最后回溯编辑操作序列。
#include <goc.h>
#include <cstdio>
#include <cstring>
#include <string>

const char* A = "kitten";
const char* B = "sitting";
int n, m;
int dp[16][16];
bool filled[16][16], path[16][16];
int curI = -1, curJ = -1, srcType = 0;   // 1 替(对角) 2 删(上) 3 插(左)
std::string msg = "";
std::string ops[32];
int opN = 0, opShow = 0;

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }
std::string CH(char c) { char b[2] = {c, 0}; return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

int min3(int x, int y, int z) { int t = x < y ? x : y; return t < z ? t : z; }

double cx(int j) { return -231.0 + j * 66.0; }
double cy(int i) { return 170.0 - i * 50.0; }

// ---- 局部重绘用的脏跟踪状态 ----
int lastKey[16][16], lastVal[16][16];
bool corrHas = false;
double corrX = 0, corrY = 0;
int corrI = 0, corrJ = 0;
int lastOpShow = 0;
bool msgInit = false;
std::string lastMsg = "";

// 静态背景只画一次：标题 + 行列字符（都在格子槽位之外）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("编辑距离（二维 dp）", 0, 26);
    pen.pu().moveTo(-350, 300).pd().c(8).textL("相同取对角，否则 1+min(删,插,替)；回溯标绿", 0, 14);
    for (int j = 0; j <= m; j++) {
        std::string s = j == 0 ? std::string("-") : CH(B[j - 1]);
        pen.pu().moveTo(cx(j), 222).pd().c(2).text(s, 0, 18);
    }
    for (int i = 0; i <= n; i++) {
        std::string s = i == 0 ? std::string("-") : CH(A[i - 1]);
        pen.pu().moveTo(-300, cy(i)).pd().c(2).text(s, 0, 18);
    }
}

// 格子：横向槽距 66 擦 64、纵向槽距 50 擦 48，正好不碰邻居/行列字符
void drawCell(int i, int j) {
    double x = cx(j), y = cy(i);
    bool isCur = (i == curI && j == curJ);
    bool isPath = path[i][j];
    int col = isPath ? 3 : (isCur ? 5 : (filled[i][j] ? 2 : 8));
    bool showText = filled[i][j] || i == 0 || j == 0;
    int key = col * 2 + (showText ? 1 : 0);
    if (key == lastKey[i][j] && dp[i][j] == lastVal[i][j]) return;
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().clsRec(64, 48);
    pen.pu().moveTo(x, y).pd().c(col).size(2);
    if (isCur || isPath) pen.rr(62, 46, col); else pen.r(62, 46);
    if (showText)
        pen.pu().moveTo(x, y).pd().c(isPath ? 15 : 0).text(dp[i][j], 0, 18);
    lastKey[i][j] = key; lastVal[i][j] = dp[i][j];
}

// 来源线走廊会盖住 (i,j) 左上那块 2x2，擦完把这 4 个格子标脏
void touchBlock(int i, int j) {
    for (int di = 0; di <= 1; di++) for (int dj = 0; dj <= 1; dj++) {
        int a = i - di, b = j - dj;
        if (a >= 0 && b >= 0 && a <= n && b <= m) lastKey[a][b] = -1;
    }
}

void render() {
    // 1) 来源线换帧：擦旧走廊 + 把被擦到的格子标脏
    bool nowShow = (curI > 0 && curJ > 0);
    if (nowShow != corrHas || (nowShow && (curI != corrI || curJ != corrJ))) {
        if (corrHas) {
            pen.setAngle(0);
            pen.pu().moveTo(corrX, corrY).pd().clsRec(74, 58);
            touchBlock(corrI, corrJ);
        }
        corrHas = nowShow; corrI = curI; corrJ = curJ;
        if (nowShow) { corrX = cx(curJ) - 33.0; corrY = cy(curI) + 25.0; }
    }
    // 2) 只重画状态变了的格子
    for (int i = 0; i <= n; i++) for (int j = 0; j <= m; j++) drawCell(i, j);
    // 3) 三条来源线画在格子之上，每帧补一遍
    if (nowShow) {
        double x = cx(curJ), y = cy(curI);
        pen.c(srcType == 1 ? 3 : 8); seg(cx(curJ - 1), cy(curI - 1), x, y, 3);
        pen.c(srcType == 2 ? 3 : 8); seg(cx(curJ), cy(curI - 1), x, y, 3);
        pen.c(srcType == 3 ? 3 : 8); seg(cx(curJ - 1), cy(curI), x, y, 3);
    }
    // 4) 操作序列只会追加：只擦画新增的那几行（行距 30、擦 26 高）
    for (int k = lastOpShow; k < opShow; k++) {
        double y = -215.0 - k * 30.0;
        pen.setAngle(0);
        pen.pu().moveTo(0, y).pd().clsRec(710, 26);
        pen.pu().moveTo(-350, y).pd().c(3).textL(S(k + 1) + ". " + ops[k], 0, 16);
    }
    lastOpShow = opShow;
    if (!msgInit || msg != lastMsg) {
        pen.setAngle(0);
        pen.pu().moveTo(0, -345).pd().clsRec(710, 26);
        pen.pu().moveTo(-350, -345).pd().c(0).textL(msg, 0, 15);
        lastMsg = msg; msgInit = true;
    }
}

int main() {
    pen.speed(10);
    n = (int)strlen(A); m = (int)strlen(B);
    memset(dp, 0, sizeof dp);
    memset(filled, 0, sizeof filled);
    memset(path, 0, sizeof path);
    for (int i = 0; i <= n; i++) { dp[i][0] = i; filled[i][0] = true; }
    for (int j = 0; j <= m; j++) { dp[0][j] = j; filled[0][j] = true; }
    for (int i = 0; i < 16; i++) for (int j = 0; j < 16; j++) { lastKey[i][j] = -1; lastVal[i][j] = -1; }
    staticBg();
    msg = "边界：dp[i][0]=i(全删)，dp[0][j]=j(全插)";
    render(); wait(0.5);
    for (int i = 1; i <= n; i++) for (int j = 1; j <= m; j++) {
        if (A[i - 1] == B[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1]; srcType = 1;
            msg = CH(A[i - 1]) + "==" + CH(B[j - 1]) + "，取对角 " + S(dp[i - 1][j - 1]);
        } else {
            int del = dp[i - 1][j], ins = dp[i][j - 1], rep = dp[i - 1][j - 1];
            int mn = min3(del, ins, rep);
            dp[i][j] = 1 + mn;
            srcType = (rep == mn) ? 1 : ((del == mn) ? 2 : 3);
            msg = "1+min(删" + S(del) + ",插" + S(ins) + ",替" + S(rep) + ")=" + S(dp[i][j]);
        }
        filled[i][j] = true; curI = i; curJ = j;
        render(); wait(0.05);
    }
    curI = -1; curJ = -1;
    // 回溯编辑操作序列
    int i = n, j = m; opN = 0;
    msg = "回溯编辑操作（绿路径）";
    render(); wait(0.3);
    while (i > 0 || j > 0) {
        path[i][j] = true;
        if (i > 0 && j > 0 && A[i - 1] == B[j - 1] && dp[i][j] == dp[i - 1][j - 1]) { i--; j--; }
        else if (i > 0 && j > 0 && A[i - 1] != B[j - 1] && dp[i][j] == dp[i - 1][j - 1] + 1) { ops[opN++] = "替换 " + CH(A[i - 1]) + "->" + CH(B[j - 1]); i--; j--; }
        else if (i > 0 && dp[i][j] == dp[i - 1][j] + 1) { ops[opN++] = "删除 " + CH(A[i - 1]); i--; }
        else if (j > 0 && dp[i][j] == dp[i][j - 1] + 1) { ops[opN++] = "插入 " + CH(B[j - 1]); j--; }
        else break;
        render(); wait(0.2);
    }
    path[0][0] = true;
    for (int k = 0; k < opN / 2; k++) { std::string t = ops[k]; ops[k] = ops[opN - 1 - k]; ops[opN - 1 - k] = t; }
    for (int k = 0; k < opN; k++) { opShow = k + 1; msg = "操作 " + S(k + 1) + "：" + ops[k]; render(); wait(0.3); }
    msg = "编辑距离 = " + S(dp[n][m]) + "，共 " + S(opN) + " 步";
    render(); wait(0.8);
    printf("编辑距离: %d 步\\n", dp[n][m]);
    return 0;
}
`,
  },
  '回溯算法框架（画图版）': {
    group: 'GoC 可视化·回溯与贪心',
    stdin: '',
    code: `// 回溯算法框架（局部重绘）：子集和（从 {3,4,5,6} 里挑和为 9 的子集，下标递增去重）。
// 把决策树画出来：每个结点是一个部分解（标签=已选元素），边=做出一个选择。
// 静态标题/图例只画一次；边/结点/剪枝短枝/nums 格子都是脏槽位，状态变了才
// setAngle(0)+clsRec 擦槽重画，被擦到的邻居按 z 序补画，不整屏 cls。
// 颜色约定：黄=当前路径(正在选择/递归)，绿=找到解(sum=9)，红=死胡同/被剪枝，
// 灰=已回退。结点旁红色短枝=isValid 剪掉的选择(下标必须递增)。
// 算法与原版一致：isSolution / isValid / makeChoice / undoChoice 四步框架。
#include <goc.h>
#include <cstdio>
#include <string>

const int MAXN = 8;
const int MAXS = 64;

struct State {
    int nums[MAXN];
    int numLen = 0;
    int path[MAXN];
    int pathLen = 0;
    int sum = 0;
    int target = 0;
};

int res[MAXS][MAXN];
int resLen[MAXS];
int resCount = 0;

bool isSolution(const State& s) { return s.sum == s.target; }
void recordSolution(const State& s) {
    for (int i = 0; i < s.pathLen; i++) res[resCount][i] = s.nums[s.path[i]];
    resLen[resCount] = s.pathLen;
    resCount++;
}
bool isValid(const State& s, int idx) {
    return s.pathLen == 0 || idx > s.path[s.pathLen - 1];
}
void makeChoice(State& s, int idx) { s.path[s.pathLen++] = idx; s.sum += s.nums[idx]; }
void undoChoice(State& s, int idx) { s.sum -= s.nums[idx]; s.pathLen--; }

// ---- 决策树（与原版同一套选择/剪枝逻辑建出来）----
struct Node {
    int parent, depth, idx;
    int sum, plen, path[MAXN];
    int child[MAXN], nchild;
    int prune[MAXN], nprune;
    int kind;              // 0 普通 1 解 2 死胡同
    int state;             // 0 未访问 1 当前 2 已回退 3 解 4 死
    double x, y;
};
Node nodes[64];
int nodeCount = 0;
int gNums[4] = {3, 4, 5, 6};
State gState;
int pruneNode = -1, pruneIdx = -1;
std::string msg = "";

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

int buildTree(State& s, int parent, int depth, int idx) {
    int id = nodeCount++;
    Node& nd = nodes[id];
    nd.parent = parent; nd.depth = depth; nd.idx = idx;
    nd.sum = s.sum; nd.plen = s.pathLen;
    for (int i = 0; i < s.pathLen; i++) nd.path[i] = s.path[i];
    nd.nchild = 0; nd.nprune = 0; nd.state = 0; nd.kind = 0;
    if (isSolution(s)) { nd.kind = 1; return id; }
    for (int i = 0; i < s.numLen; i++) {
        if (isValid(s, i)) {
            makeChoice(s, i);
            int ch = buildTree(s, id, depth + 1, i);
            nd.child[nd.nchild++] = ch;
            undoChoice(s, i);
        } else {
            nd.prune[nd.nprune++] = i;
        }
    }
    if (nd.nchild == 0) nd.kind = 2;
    return id;
}

int leafCount = 0;
double leafStep = 90.0, nextLeafX = -330.0;
void countLeaves(int id) {
    Node& nd = nodes[id];
    if (nd.nchild == 0) { leafCount++; return; }
    for (int i = 0; i < nd.nchild; i++) countLeaves(nd.child[i]);
}
void layout(int id) {
    Node& nd = nodes[id];
    if (nd.nchild == 0) { nd.x = nextLeafX; nextLeafX += leafStep; }
    else {
        double sx = 0;
        for (int i = 0; i < nd.nchild; i++) { layout(nd.child[i]); sx += nodes[nd.child[i]].x; }
        nd.x = sx / nd.nchild;
    }
    nd.y = 235.0 - nd.depth * 110.0;
}

// ---- 局部重绘小框架：脏槽位擦除 + 与擦除区相交的元素按 z 序补画 ----
// 槽位（也就是 z 序）：0..63 边，64..127 结点，128 剪枝短枝，129 nums 标题，
// 130..133 nums 格子，134 path/sum 行，135 msg 行
const int NS = 136;
long long sKey[NS], sLast[NS];
double sX[NS], sY[NS], sW[NS], sH[NS];
double sOX[NS], sOY[NS], sOW[NS], sOH[NS];
bool sHas[NS];
double eX[2 * NS + 8], eY[2 * NS + 8], eW[2 * NS + 8], eH[2 * NS + 8];
int eN = 0;
std::string lastMsgStr = "";
long long msgSeq = 0;

void setRect(int id, double x, double y, double w, double h) {
    sX[id] = x; sY[id] = y; sW[id] = w; sH[id] = h;
}
void erAdd(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0 || eN >= 2 * NS + 8) return;
    eX[eN] = x; eY[eN] = y; eW[eN] = w; eH[eN] = h; eN++;
}
bool erHit(double x, double y, double w, double h) {
    for (int k = 0; k < eN; k++)
        if (x - w / 2 < eX[k] + eW[k] / 2 && x + w / 2 > eX[k] - eW[k] / 2 &&
            y - h / 2 < eY[k] + eH[k] / 2 && y + h / 2 > eY[k] - eH[k] / 2) return true;
    return false;
}
void erErase(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0) return;
    pen.setAngle(0);                                       // clsRec 跟着笔朝向转，先归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    erAdd(x, y, w, h);
}

long long slotKey(int id) {
    if (id < 64) {                                         // 边：只有「当前路径」才变黄变粗
        int v = id + 1;
        if (v >= nodeCount) return -1;
        return nodes[v].state == 1 ? 1 : 0;
    }
    if (id < 128) {                                        // 结点：状态就是键
        int v = id - 64;
        if (v >= nodeCount) return -1;
        return nodes[v].state;
    }
    if (id == 128) return pruneNode >= 0 ? (long long)pruneNode * 8 + pruneIdx : -1;
    if (id == 129) return 0;                               // nums 标题：静态，但要参与补画
    if (id < 134) {
        int i = id - 130;
        bool inPath = false;
        for (int k = 0; k < gState.pathLen; k++) if (gState.path[k] == i) inPath = true;
        return inPath ? 1 : 0;
    }
    if (id == 134) {
        long long k = 1;
        for (int i = 0; i < gState.pathLen; i++) k = k * 8 + gState.path[i] + 1;
        return k * 100 + gState.sum;
    }
    return msgSeq;
}

void slotRect(int id) {
    if (id < 64) {
        int v = id + 1;
        if (v >= nodeCount) { setRect(id, 0, 0, 0, 0); return; }
        Node& nd = nodes[v]; Node& pa = nodes[nd.parent];
        double x1 = pa.x < nd.x ? pa.x : nd.x, x2 = pa.x < nd.x ? nd.x : pa.x;
        double y1 = pa.y < nd.y ? pa.y : nd.y, y2 = pa.y < nd.y ? nd.y : pa.y;
        setRect(id, (x1 + x2) / 2, (y1 + y2) / 2, (x2 - x1) + 8, (y2 - y1) + 8);
    } else if (id < 128) {
        int v = id - 64;
        if (v >= nodeCount) { setRect(id, 0, 0, 0, 0); return; }
        // 结点圆 r=24 + 标签「3+4+5+6」宽约 52 -> 擦 56x52；层距 110、叶距 94 都够
        setRect(id, nodes[v].x, nodes[v].y, 56, 52);
    } else if (id == 128) {
        if (pruneNode < 0) { setRect(id, 0, 0, 0, 0); return; }
        setRect(id, nodes[pruneNode].x, nodes[pruneNode].y - 44, 76, 48);
    } else if (id == 129) {
        setRect(id, -255, -250, 200, 24);
    } else if (id < 134) {
        setRect(id, -135.0 + (id - 130) * 90.0, -285, 60, 40);
    } else if (id == 134) {
        setRect(id, -175, -318, 360, 24);
    } else {
        setRect(id, 0, -345, 710, 26);
    }
}

void slotPaint(int id) {
    if (id < 64) {
        int v = id + 1;
        Node& nd = nodes[v]; Node& pa = nodes[nd.parent];
        pen.c(nd.state == 1 ? 5 : 8);
        seg(pa.x, pa.y, nd.x, nd.y, nd.state == 1 ? 4 : 2);
    } else if (id < 128) {
        Node& nd = nodes[id - 64];
        int fill = 15;
        if (nd.state == 1) fill = 5;
        else if (nd.state == 2) fill = 8;
        else if (nd.state == 3) fill = 3;
        else if (nd.state == 4) fill = 1;
        pen.pu().moveTo(nd.x, nd.y).pd().c(fill).oo(24);
        pen.pu().moveTo(nd.x, nd.y).pd().c(0).size(2).o(24);
        std::string lab = nd.plen == 0 ? "start" : "";
        for (int i = 0; i < nd.plen; i++) { if (i) lab += "+"; lab += S(gNums[nd.path[i]]); }
        int tc = (nd.state == 3 || nd.state == 4) ? 15 : 0;
        pen.pu().moveTo(nd.x, nd.y).pd().c(tc).text(lab, 0, 13);
    } else if (id == 128) {
        Node& nd = nodes[pruneNode];
        double ex = nd.x - 30 + pruneIdx * 20, ey = nd.y - 46;
        pen.c(1); seg(nd.x, nd.y - 24, ex, ey, 3);
        pen.pu().moveTo(ex, ey - 10).pd().c(1).text("x", 0, 16);
    } else if (id == 129) {
        pen.pu().moveTo(-350, -250).pd().c(0).textL("nums（黄=已在当前路径）", 0, 15);
    } else if (id < 134) {
        int i = id - 130;
        double x = -135.0 + i * 90.0;
        bool inPath = false;
        for (int k = 0; k < gState.pathLen; k++) if (gState.path[k] == i) inPath = true;
        pen.pu().moveTo(x, -285).pd().c(inPath ? 5 : 2).size(2);
        if (inPath) pen.rr(56, 36, 5); else pen.r(56, 36);
        pen.pu().moveTo(x, -285).pd().c(0).text(gNums[i], 0, 18);
    } else if (id == 134) {
        std::string p = "path: ";
        for (int k = 0; k < gState.pathLen; k++) { if (k) p += "+"; p += S(gNums[gState.path[k]]); }
        if (gState.pathLen == 0) p += "(empty)";
        pen.pu().moveTo(-350, -318).pd().c(0).textL(p + "   sum=" + S(gState.sum) + "   target=9", 0, 16);
    } else {
        pen.pu().moveTo(-350, -345).pd().c(2).textL(msg, 0, 16);
    }
}

void redraw() {
    for (int id = 0; id < NS; id++) { sKey[id] = slotKey(id); slotRect(id); }
    eN = 0;
    for (int id = 0; id < NS; id++) {                      // 只擦状态变了的槽位
        if (sKey[id] == sLast[id]) continue;
        if (sKey[id] < 0) {                                // 这一格空了：擦掉上次画的那块
            if (sHas[id]) erErase(sOX[id], sOY[id], sOW[id], sOH[id]);
        } else if (sHas[id]) {                             // 会挪位置的：新旧两块一起擦
            double x1 = sX[id] - sW[id] / 2, x2 = sX[id] + sW[id] / 2;
            double y1 = sY[id] - sH[id] / 2, y2 = sY[id] + sH[id] / 2;
            if (sOX[id] - sOW[id] / 2 < x1) x1 = sOX[id] - sOW[id] / 2;
            if (sOX[id] + sOW[id] / 2 > x2) x2 = sOX[id] + sOW[id] / 2;
            if (sOY[id] - sOH[id] / 2 < y1) y1 = sOY[id] - sOH[id] / 2;
            if (sOY[id] + sOH[id] / 2 > y2) y2 = sOY[id] + sOH[id] / 2;
            erErase((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
        } else {
            erErase(sX[id], sY[id], sW[id], sH[id]);
        }
    }
    for (int id = 0; id < NS; id++) {                      // 按 z 序补画被擦到的邻居
        if (sKey[id] >= 0 &&
            (sKey[id] != sLast[id] || erHit(sX[id], sY[id], sW[id], sH[id]))) {
            pen.setAngle(0);
            slotPaint(id);
            erAdd(sX[id], sY[id], sW[id], sH[id]);
        }
        sLast[id] = sKey[id];
        sOX[id] = sX[id]; sOY[id] = sY[id]; sOW[id] = sW[id]; sOH[id] = sH[id];
        sHas[id] = (sKey[id] >= 0);
    }
}
void redrawReset() {
    for (int id = 0; id < NS; id++) { sLast[id] = -2; sHas[id] = false; }
}

// 静态背景只画一次：标题 + 图例（都在树/面板槽位之外）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("回溯算法框架", 0, 26);
    pen.pu().moveTo(-350, 302).pd().c(8).textL("子集和：从 {3,4,5,6} 挑和为 9（下标递增去重）", 0, 14);
    pen.pu().moveTo(120, 302).pd().c(5).textL("黄=当前", 0, 13);
    pen.pu().moveTo(210, 302).pd().c(3).textL("绿=解", 0, 13);
    pen.pu().moveTo(285, 302).pd().c(1).textL("红=死/剪", 0, 13);
}

void render() {
    if (msg != lastMsgStr) { lastMsgStr = msg; msgSeq++; }
    redraw();
}

void dfsAnim(int id) {
    Node& nd = nodes[id];
    nd.state = 1;
    msg = "visit: sum=" + S(nd.sum);
    render(); wait(0.06);
    if (nd.kind == 1) {
        nd.state = 3;
        msg = "sum=9=target, record solution!";
        render(); wait(0.4);
        return;
    }
    int ci = 0;
    for (int i = 0; i < gState.numLen; i++) {
        if (isValid(gState, i)) {
            int ch = nd.child[ci++];
            makeChoice(gState, i);
            msg = "choose " + S(gState.nums[i]) + " (idx " + S(i) + "), recurse";
            render(); wait(0.05);
            dfsAnim(ch);
            undoChoice(gState, i);
            nd.state = 1;
            msg = "undo " + S(gState.nums[i]) + ", back to sum=" + S(nd.sum);
            render(); wait(0.04);
        } else {
            pruneNode = id; pruneIdx = i;
            msg = "prune: idx " + S(i) + " not increasing, cut";
            render(); wait(0.04);
            pruneNode = -1;
        }
    }
    if (nd.kind == 2) { nd.state = 4; msg = "dead end: sum!=9 and no choice"; }
    else nd.state = 2;
    render(); wait(0.03);
}

int main() {
    pen.speed(10);
    gState.numLen = 4; gState.target = 9;
    for (int i = 0; i < 4; i++) gState.nums[i] = gNums[i];
    buildTree(gState, -1, 0, -1);
    countLeaves(0);
    leafStep = 660.0 / (leafCount - 1);
    nextLeafX = -330.0;
    layout(0);
    redrawReset();
    staticBg();
    msg = "start: empty path, sum=0, target=9";
    render(); wait(0.6);
    dfsAnim(0);
    msg = "done: found " + S(resCount) + " solutions (3+6, 4+5)";
    render(); wait(0.8);
    printf("subset sum target=9: ");
    for (int i = 0; i < resCount; i++) {
        printf("{");
        for (int k = 0; k < resLen[i]; k++) printf("%d%s", res[i][k], k + 1 < resLen[i] ? "+" : "");
        printf("} ");
    }
    printf("total %d\\n", resCount);
    return 0;
}
`,
  },
  '全排列与组合（used 数组回溯）（画图版）': {
    group: 'GoC 可视化·回溯与贪心',
    stdin: '',
    code: `// 全排列与组合（used 数组回溯，局部重绘）：上半 used[] 格子 + 候选数 + 当前部分解 path[]，
// 下半把叶子结点的完整排列/组合排出来。颜色：黄=正在选择，绿=已选/叶子结果，
// 灰=已用(排列)或下标太小被跳过(组合)，红=跳过提示。
// 静态标题/固定标签只画一次；其余全是脏槽位，状态变了才 setAngle(0)+clsRec 擦槽重画，
// 排列->组合切换时按「新旧两块一起擦」处理挪位置的候选数，不整屏 cls。
// 算法与原版一致：permute 用 used[] 标已选；combine 强制下标递增(start)去重。
#include <goc.h>
#include <cstdio>
#include <string>

int mode = 0;                 // 0 排列 1 组合
int n = 3, k = 3;
int used[8], path[8];
int curDepth = 0, curI = -1, startMark = 1;
int results[64][8], resN[64], resCount = 0;
std::string msg = "";

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

// ---- 局部重绘小框架：脏槽位擦除 + 与擦除区相交的元素按 z 序补画 ----
// 槽位（也就是 z 序）：0 副标题，1 used 标签，2..6 used 格子，7 start 行，
// 8..12 候选数，13..15 path 槽，16 depth/leaves 行，17..26 叶子结果，27 msg
const int NS = 28;
long long sKey[NS], sLast[NS];
double sX[NS], sY[NS], sW[NS], sH[NS];
double sOX[NS], sOY[NS], sOW[NS], sOH[NS];
bool sHas[NS];
double eX[2 * NS + 8], eY[2 * NS + 8], eW[2 * NS + 8], eH[2 * NS + 8];
int eN = 0;
std::string lastMsgStr = "";
long long msgSeq = 0;

void setRect(int id, double x, double y, double w, double h) {
    sX[id] = x; sY[id] = y; sW[id] = w; sH[id] = h;
}
void erAdd(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0 || eN >= 2 * NS + 8) return;
    eX[eN] = x; eY[eN] = y; eW[eN] = w; eH[eN] = h; eN++;
}
bool erHit(double x, double y, double w, double h) {
    for (int k = 0; k < eN; k++)
        if (x - w / 2 < eX[k] + eW[k] / 2 && x + w / 2 > eX[k] - eW[k] / 2 &&
            y - h / 2 < eY[k] + eH[k] / 2 && y + h / 2 > eY[k] - eH[k] / 2) return true;
    return false;
}
void erErase(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0) return;
    pen.setAngle(0);                                       // clsRec 跟着笔朝向转，先归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    erAdd(x, y, w, h);
}

int candCol(int i) {
    int col = 2;
    if (mode == 0 && used[i]) col = 8;
    if (mode == 1 && (i + 1) < startMark) col = 8;
    if (i == curI) col = 5;
    return col;
}

long long slotKey(int id) {
    if (id == 0) return mode;
    if (id == 1) return mode == 0 ? 0 : -1;
    if (id < 7) {
        int i = id - 2;
        if (mode != 0 || i >= n) return -1;
        return used[i] * 2 + (curI == i ? 1 : 0);
    }
    if (id == 7) return mode == 1 ? startMark : -1;
    if (id < 13) {
        int i = id - 8;
        if (i >= n) return -1;
        return candCol(i);
    }
    if (id < 16) {
        int d = id - 13;
        if (d >= k) return -1;
        int bc = (d == curDepth) ? 5 : 2;
        return bc * 1000 + (path[d] != 0 ? path[d] + 1 : 0);
    }
    if (id == 16) return curDepth * 1000 + resCount;
    if (id < 27) return (id - 17) < resCount ? 1 : -1;
    return msgSeq;
}

void slotRect(int id) {
    if (id == 0) { setRect(id, 0, 302, 710, 24); return; }
    if (id == 1) { setRect(id, -150, 232, 420, 20); return; }
    if (id < 7) {
        int i = id - 2;
        // used 格 + 下面的下标一起擦：y 164..222，上边不碰 used[] 标签(232)
        setRect(id, (i - (n - 1) / 2.0) * 90.0, 193, 60, 58);
        return;
    }
    if (id == 7) { setRect(id, 0, 210, 710, 26); return; }
    if (id < 13) { setRect(id, (id - 8 - (n - 1) / 2.0) * 70.0, 110, 52, 52); return; }
    if (id < 16) { setRect(id, (id - 13 - (k - 1) / 2.0) * 90.0, 20, 64, 47); return; }
    if (id == 16) { setRect(id, 0, -30, 710, 26); return; }
    if (id < 27) {
        int r = id - 17;
        double x = (r % 2 == 0) ? -330.0 : 30.0;
        setRect(id, x + 110.0, -100.0 - (r / 2) * 26.0, 240, 24);
        return;
    }
    setRect(id, 0, -345, 710, 26);
}

void slotPaint(int id) {
    if (id == 0) {
        if (mode == 0)
            pen.pu().moveTo(-350, 302).pd().c(8).textL("{1,2,3} 的全排列：used[] 标已选，path[] 是当前前缀", 0, 14);
        else
            pen.pu().moveTo(-350, 302).pd().c(8).textL("C(5,3) 组合：只往后取(下标递增)，灰=比 start 小被跳过", 0, 14);
    } else if (id == 1) {
        pen.pu().moveTo(-350, 232).pd().c(0).textL("used[]", 0, 15);
    } else if (id < 7) {
        int i = id - 2;
        double x = (i - (n - 1) / 2.0) * 90.0;
        int fill = used[i] ? 3 : 15;
        pen.pu().moveTo(x, 200).pd().c(i == curI ? 5 : 2).size(2);
        if (used[i]) pen.rr(56, 40, fill); else pen.r(56, 40);
        pen.pu().moveTo(x, 200).pd().c(0).text(used[i], 0, 18);
        pen.pu().moveTo(x, 172).pd().c(8).text(i, 0, 12);
    } else if (id == 7) {
        pen.pu().moveTo(-350, 210).pd().c(0).textL("start = " + S(startMark) + "（只能取 >= start 的数）", 0, 16);
    } else if (id < 13) {
        int i = id - 8;
        double x = (i - (n - 1) / 2.0) * 70.0;
        pen.pu().moveTo(x, 110).pd().c(candCol(i)).oo(24);
        pen.pu().moveTo(x, 110).pd().c(15).text(i + 1, 0, 18);
    } else if (id < 16) {
        int d = id - 13;
        double x = (d - (k - 1) / 2.0) * 90.0;
        bool filled = path[d] != 0;
        pen.pu().moveTo(x, 20).pd().c(d == curDepth ? 5 : 2).size(2);
        if (filled) pen.rr(60, 44, 3); else pen.r(60, 44);
        pen.pu().moveTo(x, 20).pd().c(filled ? 15 : 8).text(filled ? S(path[d]) : std::string("_"), 0, 20);
    } else if (id == 16) {
        pen.pu().moveTo(-350, -30).pd().c(0).textL("depth = " + S(curDepth) + "    leaves = " + S(resCount), 0, 16);
    } else if (id < 27) {
        int r = id - 17;
        double x = (r % 2 == 0) ? -330.0 : 30.0;
        double y = -100.0 - (r / 2) * 26.0;
        std::string t = "";
        for (int i = 0; i < resN[r]; i++) { if (i) t += " "; t += S(results[r][i]); }
        pen.pu().moveTo(x, y).pd().c(3).textL(t, 0, 16);
    } else {
        pen.pu().moveTo(-350, -345).pd().c(2).textL(msg, 0, 16);
    }
}

void redraw() {
    for (int id = 0; id < NS; id++) { sKey[id] = slotKey(id); slotRect(id); }
    eN = 0;
    for (int id = 0; id < NS; id++) {                      // 只擦状态变了的槽位
        if (sKey[id] == sLast[id]) continue;
        if (sKey[id] < 0) {                                // 这一格空了：擦掉上次画的那块
            if (sHas[id]) erErase(sOX[id], sOY[id], sOW[id], sOH[id]);
        } else if (sHas[id]) {                             // 会挪位置的：新旧两块一起擦
            double x1 = sX[id] - sW[id] / 2, x2 = sX[id] + sW[id] / 2;
            double y1 = sY[id] - sH[id] / 2, y2 = sY[id] + sH[id] / 2;
            if (sOX[id] - sOW[id] / 2 < x1) x1 = sOX[id] - sOW[id] / 2;
            if (sOX[id] + sOW[id] / 2 > x2) x2 = sOX[id] + sOW[id] / 2;
            if (sOY[id] - sOH[id] / 2 < y1) y1 = sOY[id] - sOH[id] / 2;
            if (sOY[id] + sOH[id] / 2 > y2) y2 = sOY[id] + sOH[id] / 2;
            erErase((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
        } else {
            erErase(sX[id], sY[id], sW[id], sH[id]);
        }
    }
    for (int id = 0; id < NS; id++) {                      // 按 z 序补画被擦到的邻居
        if (sKey[id] >= 0 &&
            (sKey[id] != sLast[id] || erHit(sX[id], sY[id], sW[id], sH[id]))) {
            pen.setAngle(0);
            slotPaint(id);
            erAdd(sX[id], sY[id], sW[id], sH[id]);
        }
        sLast[id] = sKey[id];
        sOX[id] = sX[id]; sOY[id] = sY[id]; sOW[id] = sW[id]; sOH[id] = sH[id];
        sHas[id] = (sKey[id] >= 0);
    }
}
void redrawReset() {
    for (int id = 0; id < NS; id++) { sLast[id] = -2; sHas[id] = false; }
}

// 静态背景只画一次：标题 + path[]/leaf results 两个固定标签（都在动态槽位之外）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("全排列与组合（used 数组回溯）", 0, 26);
    pen.pu().moveTo(-350, 52).pd().c(0).textL("path[]（当前部分解）", 0, 15);
    pen.pu().moveTo(-350, -70).pd().c(3).textL("leaf results:", 0, 15);
}

void render() {
    if (msg != lastMsgStr) { lastMsgStr = msg; msgSeq++; }
    redraw();
}

void permute(int path[], int used[], int d, int n, int& count) {
    curDepth = d;
    if (d == n) {
        for (int i = 0; i < n; i++) results[resCount][i] = path[i];
        resN[resCount] = n; resCount++;
        msg = "leaf: permutation #" + S(resCount);
        render(); wait(0.08);
        ++count;
        return;
    }
    for (int i = 0; i < n; i++) {
        curDepth = d; curI = i;
        if (used[i]) {
            msg = "used[" + S(i) + "]=1, skip";
            render(); wait(0.02);
            continue;
        }
        used[i] = 1; path[d] = i + 1;
        msg = "choose " + S(i + 1) + ", used[" + S(i) + "]=1, go deeper";
        render(); wait(0.04);
        permute(path, used, d + 1, n, count);
        used[i] = 0; path[d] = 0;
        curDepth = d;
        msg = "undo " + S(i + 1) + ", used[" + S(i) + "]=0";
        render(); wait(0.02);
    }
    curI = -1;
}

void combine(int path[], int d, int start, int n, int k, int& count) {
    curDepth = d; startMark = start;
    if (d == k) {
        for (int i = 0; i < k; i++) results[resCount][i] = path[i];
        resN[resCount] = k; resCount++;
        msg = "leaf: combination #" + S(resCount);
        render(); wait(0.06);
        ++count;
        return;
    }
    for (int i = start; i <= n; i++) {
        curDepth = d; curI = i - 1;
        path[d] = i;
        msg = "choose " + S(i) + ", next start=" + S(i + 1);
        render(); wait(0.03);
        combine(path, d + 1, i + 1, n, k, count);
        path[d] = 0; curDepth = d; startMark = start;
        msg = "undo " + S(i);
        render(); wait(0.02);
    }
    curI = -1;
}

int main() {
    pen.speed(10);
    for (int i = 0; i < 8; i++) { used[i] = 0; path[i] = 0; }
    mode = 0; n = 3; k = 3;
    redrawReset();
    staticBg();
    msg = "permute {1,2,3}: try each unused number layer by layer";
    render(); wait(0.5);
    int count = 0;
    permute(path, used, 0, 3, count);
    msg = "permutations done: " + S(count) + " = 3!";
    render(); wait(0.7);
    // 切换到组合
    resCount = 0; mode = 1; n = 5; k = 3; startMark = 1;
    for (int i = 0; i < 8; i++) { used[i] = 0; path[i] = 0; }
    msg = "combine C(5,3): only pick forward (index increasing)";
    render(); wait(0.5);
    count = 0;
    combine(path, 0, 1, 5, 3, count);
    msg = "combinations done: " + S(count) + " = C(5,3)";
    render(); wait(0.7);
    printf("permutations=6 (3!), combinations=10 (C(5,3))\\n");
    return 0;
}
`,
  },
  '八皇后（列与对角线标记数组）（画图版）': {
    group: 'GoC 可视化·回溯与贪心',
    stdin: '',
    code: `// 八皇后（列与对角线标记数组，局部重绘）：8x8 棋盘逐行放皇后。
// col[c]/diag1[r+c]/diag2[r-c+N] 三个标记数组做 O(1) 冲突检测（与原版一致）。
// 棋盘格/候选高亮/攻击线/皇后都是脏槽位：放/撤皇后只擦那一格再重画，攻击线换帧
// 先擦旧线走廊再把被擦到的格子按 z 序补画，不整屏 cls。
// 颜色：蓝=已放皇后，黄=刚放下的皇后，绿=当前行可放/最终解，红=被攻击/冲突回溯。
// 冲突时画出已有皇后的攻击线(红)。只画放/撤关键帧，找到第一个解后静默数完 92 个。
#include <goc.h>
#include <cstdio>
#include <string>

const int N = 8;
int col[8], diag1[16], diag2[16], pos[8];
int solutions = 0;
int firstPos[8]; bool haveFirst = false;
bool anim = true; int frames = 0; const int MAXFRAMES = 130;
int placed = 0, curCol = -1, conflictRow = -1;
std::string msg = "";

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

const double CELL = 54.0, X0 = -216.0, TOP = 240.0;
double cellX(int c) { return X0 + c * CELL + CELL / 2; }
double cellY(int r) { return TOP - r * CELL - CELL / 2; }

// 把过皇后、斜率 m(=±1) 的攻击线裁剪到棋盘矩形内，返回两个端点（擦走廊要用）
bool diagEnds(double qx, double qy, double m, double& x1, double& y1, double& x2, double& y2) {
    double bx0 = X0, bx1 = X0 + N * CELL, by0 = TOP - N * CELL, by1 = TOP;
    double px[4], py[4]; int np = 0;
    double yL = qy + m * (bx0 - qx);
    if (yL >= by0 && yL <= by1) { px[np] = bx0; py[np] = yL; np++; }
    double yR = qy + m * (bx1 - qx);
    if (yR >= by0 && yR <= by1) { px[np] = bx1; py[np] = yR; np++; }
    double xB = qx + (by0 - qy) / m;
    if (xB >= bx0 && xB <= bx1) { px[np] = xB; py[np] = by0; np++; }
    double xT = qx + (by1 - qy) / m;
    if (xT >= bx0 && xT <= bx1) { px[np] = xT; py[np] = by1; np++; }
    if (np < 2) return false;
    x1 = px[0]; y1 = py[0]; x2 = px[np - 1]; y2 = py[np - 1];
    return true;
}

// ---- 局部重绘小框架：脏槽位擦除 + 与擦除区相交的元素按 z 序补画 ----
// 槽位（也就是 z 序）：0..63 棋盘格，64..71 当前行候选高亮，72..95 攻击线
// (每行 3 条：竖/主对角/副对角)，96..103 皇后，104 统计行，105 msg
const int NS = 106;
long long sKey[NS], sLast[NS];
double sX[NS], sY[NS], sW[NS], sH[NS];
double sOX[NS], sOY[NS], sOW[NS], sOH[NS];
bool sHas[NS];
double eX[2 * NS + 8], eY[2 * NS + 8], eW[2 * NS + 8], eH[2 * NS + 8];
int eN = 0;
bool gFinal = false;
std::string lastMsgStr = "";
long long msgSeq = 0;

void setRect(int id, double x, double y, double w, double h) {
    sX[id] = x; sY[id] = y; sW[id] = w; sH[id] = h;
}
void erAdd(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0 || eN >= 2 * NS + 8) return;
    eX[eN] = x; eY[eN] = y; eW[eN] = w; eH[eN] = h; eN++;
}
bool erHit(double x, double y, double w, double h) {
    for (int k = 0; k < eN; k++)
        if (x - w / 2 < eX[k] + eW[k] / 2 && x + w / 2 > eX[k] - eW[k] / 2 &&
            y - h / 2 < eY[k] + eH[k] / 2 && y + h / 2 > eY[k] - eH[k] / 2) return true;
    return false;
}
void erErase(double x, double y, double w, double h) {
    if (w <= 0 || h <= 0) return;
    pen.setAngle(0);                                       // clsRec 跟着笔朝向转，先归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
    erAdd(x, y, w, h);
}

int queenCol(int r) {
    int qc = gFinal ? 3 : 2;
    if (!gFinal && r == placed - 1 && curCol >= 0) qc = 5;
    return qc;
}
bool hlBad(int r, int c) { return col[c] || diag1[r + c] || diag2[r - c + N]; }

long long slotKey(int id) {
    if (id < 64) return 0;                                 // 棋盘格外观恒定，只参与 z 序补画
    if (id < 72) {
        int c = id - 64;
        if (gFinal || placed >= N) return -1;
        return placed * 4 + (hlBad(placed, c) ? 1 : 3);
    }
    if (id < 96) {
        int r = (id - 72) / 3, t = (id - 72) % 3;
        if (conflictRow < 0 || r >= placed) return -1;
        return pos[r] * 3 + t;
    }
    if (id < 104) {
        int r = id - 96;
        if (r >= placed) return -1;
        return pos[r] * 8 + queenCol(r);
    }
    if (id == 104) return solutions * 100 + placed;
    return msgSeq;
}

void slotRect(int id) {
    if (id < 64) {
        // 格子紧挨着（槽距 54），擦 52x52 留在 2px 缝里，不碰邻居；重画时补满 54x54
        setRect(id, cellX(id % 8), cellY(id / 8), 52, 52);
        return;
    }
    if (id < 72) {
        int c = id - 64;
        if (gFinal || placed >= N) { setRect(id, 0, 0, 0, 0); return; }
        setRect(id, cellX(c), cellY(placed), 46, 46);
        return;
    }
    if (id < 96) {
        int r = (id - 72) / 3, t = (id - 72) % 3;
        if (conflictRow < 0 || r >= placed) { setRect(id, 0, 0, 0, 0); return; }
        double qx = cellX(pos[r]), qy = cellY(r);
        if (t == 0) { setRect(id, qx, TOP - N * CELL / 2, 6, N * CELL + 8); return; }
        double x1, y1, x2, y2;
        if (!diagEnds(qx, qy, t == 1 ? 1.0 : -1.0, x1, y1, x2, y2)) { setRect(id, 0, 0, 0, 0); return; }
        double lx = x1 < x2 ? x1 : x2, hx = x1 < x2 ? x2 : x1;
        double ly = y1 < y2 ? y1 : y2, hy = y1 < y2 ? y2 : y1;
        setRect(id, (lx + hx) / 2, (ly + hy) / 2, (hx - lx) + 6, (hy - ly) + 6);
        return;
    }
    if (id < 104) {
        int r = id - 96;
        if (r >= placed) { setRect(id, 0, 0, 0, 0); return; }
        setRect(id, cellX(pos[r]), cellY(r), 40, 40);
        return;
    }
    if (id == 104) { setRect(id, 0, -235, 710, 26); return; }
    setRect(id, 0, -330, 710, 26);
}

void slotPaint(int id) {
    if (id < 64) {
        double x = cellX(id % 8), y = cellY(id / 8);
        pen.pu().moveTo(x, y).pd().c(15).rr(CELL, CELL, 15);
        pen.pu().moveTo(x, y).pd().c(8).size(1).r(CELL, CELL);
    } else if (id < 72) {
        int c = id - 64;
        double x = cellX(c), y = cellY(placed);
        pen.pu().moveTo(x, y).pd().c(hlBad(placed, c) ? 1 : 3).size(2).r(CELL - 12, CELL - 12);
    } else if (id < 96) {
        int r = (id - 72) / 3, t = (id - 72) % 3;
        double qx = cellX(pos[r]), qy = cellY(r);
        pen.c(1);
        if (t == 0) { seg(qx, TOP, qx, TOP - N * CELL, 1.5); return; }
        double x1, y1, x2, y2;
        if (diagEnds(qx, qy, t == 1 ? 1.0 : -1.0, x1, y1, x2, y2)) seg(x1, y1, x2, y2, 1.5);
    } else if (id < 104) {
        int r = id - 96;
        double x = cellX(pos[r]), y = cellY(r);
        pen.pu().moveTo(x, y).pd().c(queenCol(r)).oo(18);
        pen.pu().moveTo(x, y).pd().c(15).text("Q", 0, 18);
    } else if (id == 104) {
        pen.pu().moveTo(-350, -235).pd().c(0).textL("solutions = " + S(solutions) + "    placed = " + S(placed), 0, 16);
    } else {
        pen.pu().moveTo(-350, -330).pd().c(2).textL(msg, 0, 16);
    }
}

void redraw() {
    for (int id = 0; id < NS; id++) { sKey[id] = slotKey(id); slotRect(id); }
    eN = 0;
    for (int id = 0; id < NS; id++) {                      // 只擦状态变了的槽位
        if (sKey[id] == sLast[id]) continue;
        if (sKey[id] < 0) {                                // 这一格空了：擦掉上次画的那块
            if (sHas[id]) erErase(sOX[id], sOY[id], sOW[id], sOH[id]);
        } else if (sHas[id]) {                             // 会挪位置的：新旧两块一起擦
            double x1 = sX[id] - sW[id] / 2, x2 = sX[id] + sW[id] / 2;
            double y1 = sY[id] - sH[id] / 2, y2 = sY[id] + sH[id] / 2;
            if (sOX[id] - sOW[id] / 2 < x1) x1 = sOX[id] - sOW[id] / 2;
            if (sOX[id] + sOW[id] / 2 > x2) x2 = sOX[id] + sOW[id] / 2;
            if (sOY[id] - sOH[id] / 2 < y1) y1 = sOY[id] - sOH[id] / 2;
            if (sOY[id] + sOH[id] / 2 > y2) y2 = sOY[id] + sOH[id] / 2;
            erErase((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1);
        } else {
            erErase(sX[id], sY[id], sW[id], sH[id]);
        }
    }
    for (int id = 0; id < NS; id++) {                      // 按 z 序补画被擦到的邻居
        if (sKey[id] >= 0 &&
            (sKey[id] != sLast[id] || erHit(sX[id], sY[id], sW[id], sH[id]))) {
            pen.setAngle(0);
            slotPaint(id);
            erAdd(sX[id], sY[id], sW[id], sH[id]);
        }
        sLast[id] = sKey[id];
        sOX[id] = sX[id]; sOY[id] = sY[id]; sOW[id] = sW[id]; sOH[id] = sH[id];
        sHas[id] = (sKey[id] >= 0);
    }
}
void redrawReset() {
    for (int id = 0; id < NS; id++) { sLast[id] = -2; sHas[id] = false; }
}

// 静态背景只画一次：标题 + 底部颜色图例（都在棋盘/统计槽位之外）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("八皇后（列与对角线标记数组）", 0, 26);
    pen.pu().moveTo(-350, 302).pd().c(8).textL("col/diag1/diag2 标记冲突，逐行放，冲突就回溯", 0, 14);
    pen.pu().moveTo(-350, -265).pd().c(8).textL("green=free  red=attacked  yellow=just placed", 0, 13);
}

void render(bool isFinal) {
    gFinal = isFinal;
    if (msg != lastMsgStr) { lastMsgStr = msg; msgSeq++; }
    redraw();
}

void dfs(int row) {
    if (row == N) {
        if (!haveFirst) { for (int r = 0; r < N; r++) firstPos[r] = pos[r]; haveFirst = true; }
        ++solutions;
        if (anim && solutions == 1) {
            placed = N; curCol = -1; conflictRow = -1;
            msg = "first solution found! keep counting silently...";
            render(true); wait(1.0);
            anim = false;
        }
        return;
    }
    placed = row;
    bool any = false;
    for (int c = 0; c < N; c++) {
        int d1 = row + c, d2 = row - c + N;
        if (col[c] || diag1[d1] || diag2[d2]) continue;
        any = true;
        col[c] = diag1[d1] = diag2[d2] = 1;
        pos[row] = c;
        placed = row + 1; curCol = c;
        if (anim && frames < MAXFRAMES) {
            msg = "place row " + S(row) + " col " + S(c + 1);
            render(false); wait(0.03); frames++;
        }
        dfs(row + 1);
        col[c] = diag1[d1] = diag2[d2] = 0;
        placed = row; curCol = -1;
        if (anim && frames < MAXFRAMES) {
            msg = "undo row " + S(row) + " col " + S(c + 1) + ", backtrack";
            render(false); wait(0.02); frames++;
        }
    }
    if (!any) {
        conflictRow = row;
        if (anim && frames < MAXFRAMES) {
            msg = "row " + S(row) + " all attacked -> backtrack";
            render(false); wait(0.05); frames++;
        }
        conflictRow = -1;
    }
}

int main() {
    pen.speed(10);
    for (int i = 0; i < N; i++) col[i] = 0;
    for (int i = 0; i < 16; i++) { diag1[i] = 0; diag2[i] = 0; }
    redrawReset();
    staticBg();
    msg = "start: place queens row by row";
    render(false); wait(0.5);
    dfs(0);
    // 最终：展示第一个解
    for (int r = 0; r < N; r++) pos[r] = firstPos[r];
    placed = N; curCol = -1; conflictRow = -1;
    std::string cols = "";
    for (int r = 0; r < N; r++) { if (r) cols += " "; cols += S(firstPos[r] + 1); }
    msg = "total " + S(solutions) + " solutions, first cols: " + cols;
    render(true); wait(1.0);
    printf("8-queens: %d solutions, first cols %s\\n", solutions, cols.c_str());
    return 0;
}
`,
  },
  '贪心：活动选择与找零钱（画图版）': {
    group: 'GoC 可视化·回溯与贪心',
    stdin: '',
    code: `// 贪心：活动选择与找零钱（局部重绘）。上半=活动时间轴(按结束时间排序后逐个选相容活动)，
// 下半=找零钱从大面额到小面额逐个拿。颜色：黄=正在处理，绿=选中/已拿，
// 红=冲突/被拒，橙=lastEnd 分界线。算法与原版一致：选择排序按结束时间 +
// 能塞就塞；找零钱面额降序能拿就拿。
// 静态标题/时间轴/分隔线只画一次；活动行、硬币、已拿硬币都脏跟踪擦槽重画；
// lastEnd 分界线换位置先擦旧走廊再把被穿过的活动行全部补画，不整屏 cls。
#include <goc.h>
#include <cstdio>
#include <string>

struct Act { int s, e, id; };
Act a[6] = {{1,3,1},{2,5,2},{3,7,3},{0,4,4},{5,9,5},{8,10,6}};
int actState[6];             // 0 未处理 1 当前 2 选中 3 拒绝
int lastEnd = -1;
int coin[4] = {25, 10, 5, 1}, num[4] = {0};
int amount = 67, rest = 67;
int taken[16], takenN = 0;
int curCoin = -1, phase = 0;
int cmpA = -1, cmpB = -1;
std::string msg = "";

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

double timeX(int t) { return -300.0 + t * 60.0; }
double rowY(int i) { return 250.0 - i * 27.0; }

// ---- 局部重绘用的脏跟踪状态 ----
int lastActKey[6];                 // 活动行：起止时间+编号+颜色
int lastLineKey = -2;              // lastEnd 分界线
double lastLineX = 0;
int lastCoinKey[4], lastTakenKey[16];
int lastRest = -1;
bool msgInit = false;
std::string lastMsg = "";

// 静态背景只画一次：标题、时间轴/刻度/刻度数字、分隔线、两个小标题
// （时间轴放在最下面一条活动行的擦除区之外，分隔线放在硬币擦除区之外）
void staticBg() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("贪心：活动选择与找零钱", 0, 26);
    pen.pu().moveTo(-350, 302).pd().c(8).textL("上：结束时间排序+选相容活动   下：大面额优先找零", 0, 14);
    pen.pu().moveTo(-350, 278).pd().c(0).textL("活动选择（按结束时间升序，能塞就塞）", 0, 15);
    pen.c(8); seg(-300, 90, 300, 90, 2);
    for (int t = 0; t <= 10; t++) {
        double x = timeX(t);
        pen.c(8); seg(x, 85, x, 95, 1);
        pen.pu().moveTo(x, 73).pd().c(8).text(t, 0, 11);
    }
    pen.c(8); seg(-350, 40, 350, 40, 1);
    pen.pu().moveTo(-350, -20).pd().c(0).textL("找零钱（面额降序，能拿就拿）", 0, 15);
    pen.pu().moveTo(-350, -185).pd().c(3).textL("taken:", 0, 14);
}

// 活动行：行距 27、整行擦 26 高，上边不碰小标题(278)，下边不碰时间轴(95)
void drawAct(int i) {
    double y = rowY(i);
    double x1 = timeX(a[i].s), x2 = timeX(a[i].e);
    int col = 2;
    if (actState[i] == 1) col = 5;
    else if (actState[i] == 2) col = 3;
    else if (actState[i] == 3) col = 1;
    if (phase == 0 && (i == cmpA || i == cmpB)) col = 5;
    int key = ((a[i].s * 16 + a[i].e) * 8 + a[i].id) * 8 + col;
    if (key == lastActKey[i]) return;
    pen.setAngle(0);
    pen.pu().moveTo(32, y).pd().clsRec(680, 26);
    pen.pu().moveTo((x1 + x2) / 2, y).pd().c(col).rr(x2 - x1, 20, col);
    pen.pu().moveTo((x1 + x2) / 2, y).pd().c(15).text(a[i].id, 0, 13);
    pen.pu().moveTo(x2 + 8, y).pd().c(0).textL("[" + S(a[i].s) + "," + S(a[i].e) + ")", 0, 11);
    lastActKey[i] = key;
}

// 分界线换位置：先擦旧走廊（会穿过全部 6 行活动条），把它们全标脏
void lineErase() {
    bool show = (phase >= 1 && lastEnd >= 0);
    int key = show ? lastEnd : -1;
    if (key == lastLineKey) return;
    if (lastLineKey >= 0) {
        pen.setAngle(0);
        pen.pu().moveTo(lastLineX, 185.5).pd().clsRec(50, 167);
        for (int i = 0; i < 6; i++) lastActKey[i] = -1;
    }
    lastLineKey = key;
}
// 分界线画在活动条之上，每帧补一遍（活动条擦槽会削到它）
void linePaint() {
    if (phase >= 1 && lastEnd >= 0) {
        lastLineX = timeX(lastEnd);
        pen.setAngle(0);
        pen.c(14); seg(lastLineX, 255, lastLineX, 105, 3);
        pen.pu().moveTo(lastLineX, 262).pd().c(14).text("lastEnd", 0, 11);
    }
}

// 硬币：槽距 180、擦 64x80（盖住圆 + 下面的 xN），上边不碰小标题(-20)
void drawCoin(int i) {
    double x = -270.0 + i * 180.0;
    int col = 2;
    if (i == curCoin) col = 5;
    else if (num[i] > 0) col = 3;
    int key = col * 100 + num[i];
    if (key == lastCoinKey[i]) return;
    pen.setAngle(0);
    pen.pu().moveTo(x, -88).pd().clsRec(64, 80);
    pen.pu().moveTo(x, -80).pd().c(col).oo(28);
    pen.pu().moveTo(x, -80).pd().c(15).text(coin[i], 0, 18);
    pen.pu().moveTo(x, -118).pd().c(0).text("x" + S(num[i]), 0, 14);
    lastCoinKey[i] = key;
}

void drawRest() {
    if (rest == lastRest) return;
    pen.setAngle(0);
    pen.pu().moveTo(0, -152).pd().clsRec(710, 24);
    pen.pu().moveTo(-350, -152).pd().c(0).textL("amount = " + S(amount) + "    rest = " + S(rest), 0, 16);
    lastRest = rest;
}

// 已拿的硬币：槽距 60、擦 40x40，不碰左边的 taken: 标签
void drawTaken(int i) {
    int key = i < takenN ? taken[i] : -1;
    if (key == lastTakenKey[i]) return;
    double x = -230.0 + i * 60.0;
    pen.setAngle(0);
    pen.pu().moveTo(x, -215).pd().clsRec(40, 40);
    if (key >= 0) {
        pen.pu().moveTo(x, -215).pd().c(3).oo(18);
        pen.pu().moveTo(x, -215).pd().c(15).text(taken[i], 0, 13);
    }
    lastTakenKey[i] = key;
}

void render() {
    lineErase();
    for (int i = 0; i < 6; i++) drawAct(i);
    linePaint();
    for (int i = 0; i < 4; i++) drawCoin(i);
    drawRest();
    for (int i = 0; i < 16; i++) drawTaken(i);
    if (!msgInit || msg != lastMsg) {
        pen.setAngle(0);
        pen.pu().moveTo(0, -330).pd().clsRec(710, 26);
        pen.pu().moveTo(-350, -330).pd().c(2).textL(msg, 0, 16);
        lastMsg = msg; msgInit = true;
    }
}

int main() {
    pen.speed(10);
    for (int i = 0; i < 6; i++) actState[i] = 0;
    for (int i = 0; i < 6; i++) lastActKey[i] = -1;
    for (int i = 0; i < 4; i++) lastCoinKey[i] = -1;
    for (int i = 0; i < 16; i++) lastTakenKey[i] = -1;
    staticBg();
    // 阶段0：选择排序按结束时间
    phase = 0;
    msg = "selection sort by end time";
    render(); wait(0.4);
    for (int i = 0; i < 5; i++) {
        int m = i;
        for (int j = i + 1; j < 6; j++) {
            cmpA = m; cmpB = j;
            render(); wait(0.02);
            if (a[j].e < a[m].e) m = j;
        }
        Act t = a[i]; a[i] = a[m]; a[m] = t;
        cmpA = -1; cmpB = -1;
        msg = "put activity " + S(a[i].id) + " (end=" + S(a[i].e) + ") at position " + S(i);
        render(); wait(0.08);
    }
    msg = "sorted by end time, now greedy pick";
    render(); wait(0.4);
    // 阶段1：贪心选相容活动
    phase = 1;
    int chosen[6], k = 0;
    lastEnd = -1;
    for (int i = 0; i < 6; i++) {
        actState[i] = 1;
        msg = "activity " + S(a[i].id) + ": [" + S(a[i].s) + "," + S(a[i].e) + ")";
        render(); wait(0.15);
        if (a[i].s >= lastEnd) {
            actState[i] = 2; chosen[k++] = a[i].id; lastEnd = a[i].e;
            msg += " -> select (green)";
        } else {
            actState[i] = 3;
            msg += " -> conflict (red)";
        }
        render(); wait(0.2);
    }
    msg = "activity done: picked " + S(k) + " activities";
    render(); wait(0.6);
    // 阶段2：找零钱
    phase = 2;
    rest = amount; takenN = 0;
    for (int i = 0; i < 4; i++) num[i] = 0;
    msg = "coin change for " + S(amount) + ", largest first";
    render(); wait(0.4);
    for (int i = 0; i < 4; i++) {
        curCoin = i;
        num[i] = rest / coin[i];
        msg = "coin " + S(coin[i]) + ": take " + S(num[i]);
        render(); wait(0.25);
        for (int t = 0; t < num[i]; t++) {
            taken[takenN++] = coin[i];
            rest -= coin[i];
            msg = "take one " + S(coin[i]) + ", rest=" + S(rest);
            render(); wait(0.22);
        }
    }
    curCoin = -1;
    int total = num[0] + num[1] + num[2] + num[3];
    msg = "done: " + S(total) + " coins, rest=" + S(rest);
    render(); wait(0.8);
    printf("activities picked=%d (ids", k);
    for (int i = 0; i < k; i++) printf(" %d", chosen[i]);
    printf("); coins 67=25x2+10x1+5x1+1x2, total %d\\n", total);
    return 0;
}
`,
  },
  '素数筛：埃氏筛与欧拉筛（画图版）': {
    group: 'GoC 可视化·数学与位运算',
    stdin: '',
    code: `// 素数筛的可视化版（局部重绘）：算法与数据同原版（N = 50，埃氏筛从 i*i 起划倍数，
// 欧拉筛遇到 i % primes[k] == 0 就停）。上排格子跑埃氏筛，下排格子跑欧拉筛，
// 最后对比两边「划掉」的次数：合数在埃氏筛里会被重复划，欧拉筛只划一次。
// 颜色：白底灰框 = 还没处理，绿 = 确认的素数，红 = 被划掉的合数，
//       黄底 = 这一帧正在划的数，黄粗框 = 当前素数 / 当前的 i，橙粗框 = 当前用的质因子。
// 埃氏筛格子右上角的小数字 = 这个数被划过的次数（大于 1 就是重复劳动）。
// 绘制：标题 / 两行筛法说明 / 图例只画一次；98 个数字格与 5 行文字各自脏跟踪，
//       状态变了才 setAngle(0) + clsRec 擦掉自己的槽再重画，不整屏 cls。
#include <goc.h>
#include <cstdio>
#include <cstring>
#include <string>

const int N = 50;
bool isCompA[51], isCompB[51];
int cntA[51], cntB[51];
int primes[32], pc = 0;
int marksA = 0, marksB = 0;

int stage = 0;                  // 0 埃氏筛 1 欧拉筛 2 对比
int curA = 1;                   // 埃氏筛外层走到哪（<= curA 且没被划的就是素数）
int hiPrime = -1, hiMark = -1, hiP = -1;
std::string msg = "";

std::string S(int v) { return std::to_string(v); }

void txtL(double x, double y, std::string s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

const double CW = 62, CH = 34;
double gx(int c) { return -310 + CW / 2 + c * CW; }
double gyA(int r) { return 262 - r * 38; }
double gyB(int r) { return 22 - r * 38; }

bool inPrimes(int v) {
    for (int k = 0; k < pc; k++) if (primes[k] == v) return true;
    return false;
}

// ---- 局部重绘的脏跟踪状态 ----
int sigA[51], sigB[51];
std::string lastMA, lastMB, lastPS, lastMsg, lastCmp;

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                                     // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

// 左对齐文字槽：内容没变就一个字都不动；擦除框 left-2 .. left+w-2
void putL(const std::string &s, std::string &last, double left, double y,
          double w, double h, int col, int size) {
    if (s == last) return;
    wipe(left + w / 2 - 2, y, w, h);
    txtL(left, y, s, col, size);
    last = s;
}

// 一个数字格：格距 62×38，含 4px 粗框的 footprint 正好 62×34，
// 擦 62×36 刚好盖住自己（含右上角小字），左右不啃邻居、上下不碰说明文字
void drawCell(int v, bool isB, int fill, int tc, int oc, int ow, int cnt) {
    int idx = v - 2, c = idx % 10, r = idx / 10;
    double x = gx(c), y = isB ? gyB(r) : gyA(r);
    wipe(x, y, CW, 36);
    pen.pu().moveTo(x, y).pd().size(2).rr(CW - 4, CH - 4, fill);
    pen.pu().moveTo(x, y).pd().size(ow).c(oc).r(CW - 4, CH - 4, oc);
    pen.pu().moveTo(x, y).pd().c(tc).text(v, tc, 16);
    if (!isB && cnt > 1)
        pen.pu().moveTo(x + 20, y + 9).pd().c(15).text(cnt, 15, 11);
}

// 一排 49 个格子：2..50，10 列 5 行；只重画「状态变了」的格子
void drawGrid(bool isB) {
    bool act = (stage == 0 && !isB) || (stage == 1 && isB);
    for (int v = 2; v <= N; v++) {
        bool comp = isB ? isCompB[v] : isCompA[v];
        bool pr = isB ? inPrimes(v) : (v <= curA && !isCompA[v]);
        int fill = 15, tc = 0, oc = 8, ow = 2;
        if (comp) { fill = 1; tc = 15; oc = 1; }
        else if (pr) { fill = 3; tc = 15; oc = 3; }
        if (act && v == hiMark) { fill = 5; tc = 0; oc = 1; ow = 3; }
        if (act && v == hiPrime) { oc = 5; ow = 4; }
        if (act && isB && v == hiP) { oc = 14; ow = 4; }
        int cnt = isB ? 0 : cntA[v];
        int sig = (((fill * 16 + tc) * 16 + oc) * 8 + ow) * 8 + cnt;
        int &last = isB ? sigB[v] : sigA[v];
        if (sig != last) { drawCell(v, isB, fill, tc, oc, ow, cnt); last = sig; }
    }
}

// 每帧：两排格子 + 底部计数与说明（静态背景已经在画布上，不再整屏重画）
void draw() {
    drawGrid(false);
    drawGrid(true);
    putL("埃氏筛划掉次数 = " + S(marksA), lastMA, -350, -178, 232, 30, 1, 20);
    putL("欧拉筛划掉次数 = " + S(marksB), lastMB, 20, -178, 242, 30, 10, 20);
    std::string ps = "";
    for (int k = 0; k < pc; k++) ps += S(primes[k]) + " ";
    putL("素数表（" + S(pc) + " 个）：" + ps, lastPS, -350, -212, 470, 26, 0, 15);
    putL(msg, lastMsg, -350, -252, 620, 26, 2, 17);
    if (stage == 2)
        putL("合数 " + S(N - 1 - pc) + " 个：埃氏筛划 " + S(marksA) +
             " 次（有重复），欧拉筛划 " + S(marksB) + " 次 = 严格 O(n)", lastCmp,
             -350, -298, 650, 26, 0, 16);
}

// 静态背景只画一次：标题 / 两行筛法说明 / 图例都在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("素数筛：埃氏筛与欧拉筛", 0, 26);
    txtL(-350, 300, "埃氏筛：素数 i 从 i*i 起划倍数（合数会被重复划）", 1, 15);
    txtL(-350, 62, "欧拉筛：每个合数只被最小质因子划一次", 10, 15);
    txtL(-350, -338, "白 = 未处理   绿 = 素数   红 = 合数   黄底 = 正在划   右上角小字 = 被划次数", 8, 13);
}

int main() {
    pen.speed(10);
    memset(isCompA, 0, sizeof isCompA);
    memset(isCompB, 0, sizeof isCompB);
    memset(cntA, 0, sizeof cntA);
    memset(cntB, 0, sizeof cntB);
    for (int v = 0; v <= N; v++) { sigA[v] = -1; sigB[v] = -1; }
    drawStatic();

    /* ---- 埃氏筛：每找到一个素数，把它的倍数全划掉 ---- */
    stage = 0;
    msg = "埃氏筛开始：从 2 起，没被划掉的数就是素数";
    draw(); wait(0.4);
    for (int i = 2; i <= N; ++i) {
        curA = i;
        if (!isCompA[i]) {
            hiPrime = i; hiMark = -1;
            if (i * i > N) msg = "素数 " + S(i) + "：" + S(i * i) + " > 50，没有倍数要划";
            else msg = "素数 " + S(i) + "：从 " + S(i * i) + " 起每隔 " + S(i) + " 划一个";
            draw(); wait(0.05);
            for (int j = i * i; j <= N; j += i) {
                isCompA[j] = true; ++marksA; ++cntA[j];
                hiMark = j;
                msg = "划掉 " + S(j);
                if (cntA[j] > 1) msg += "（第 " + S(cntA[j]) + " 次被划，重复劳动）";
                draw(); wait(0.03);
            }
        }
    }
    hiPrime = -1; hiMark = -1; curA = N;
    msg = "埃氏筛结束：一共划了 " + S(marksA) + " 次";
    draw(); wait(0.4);

    /* ---- 欧拉筛：每个合数只被最小质因子划一次 ---- */
    stage = 1; hiP = -1;
    msg = "欧拉筛开始：i 从 2 走到 50，只让最小质因子去划";
    draw(); wait(0.4);
    for (int i = 2; i <= N; ++i) {
        if (!isCompB[i]) {
            primes[pc++] = i;
            hiPrime = i; hiMark = -1; hiP = -1;
            msg = "i = " + S(i) + " 没被划过 → 收进素数表";
            draw(); wait(0.03);
        }
        for (int k = 0; k < pc && i * primes[k] <= N; ++k) {
            int v = i * primes[k];
            isCompB[v] = true; ++marksB; ++cntB[v];
            hiPrime = i; hiMark = v; hiP = primes[k];
            msg = "i = " + S(i) + " × " + S(primes[k]) + " = " + S(v) + "，只划这一次";
            if (i % primes[k] == 0) msg += "；" + S(i) + " % " + S(primes[k]) + " == 0 → 停";
            draw(); wait(0.03);
            if (i % primes[k] == 0) break;
        }
    }
    hiPrime = -1; hiMark = -1; hiP = -1;
    stage = 2;
    msg = "两种筛找出的素数一样多，但划掉的次数不一样";
    draw(); wait(1.0);
    printf("50 以内素数 %d 个；埃氏筛划 %d 次，欧拉筛划 %d 次（合数 %d 个）\\n",
           pc, marksA, marksB, N - 1 - pc);
    return 0;
}
`,
  },
  '辗转相除 / 扩展欧几里得 / 快速幂（画图版）': {
    group: 'GoC 可视化·数学与位运算',
    stdin: '',
    code: `// 辗转相除 / 扩展欧几里得 / 快速幂的可视化版（局部重绘）：算法与数据同原版
// （gcd(1071,462)、lcm、exgcd(35,15)、2^10 mod 1000、3^13 mod 97、7^0 mod 5）。
// 三段依次演示：① 大矩形里切正方形，切到没有剩余，最后的边长就是 gcd；
// ② 扩展欧几里得的递归表，先往下递归（x、y 是 ?），到 b == 0 再回代填回来；
// ③ 快速幂：指数的二进制位 + 一条平方链，位是 1 就把 a 乘进结果 r。
// 颜色：黄 = 这一帧正在处理，绿 = 已完成 / 结果，蓝紫橙 = 辗转相除的三轮切割，
//       灰 = 还没用到的位 / 节点。
// 绘制：标题只画一次；① 的正方形静态累积，每帧只画新切下来的那一个，上一刀由黄
//       改回本色（不透明原位盖旧），剩余矩形的黄框画在还没切的空白区里、下一帧先擦掉；
//       ②③ 的表格 / 二进制位 / 平方链 / 结果格各自脏跟踪，变了才擦自己的槽重画。
#include <goc.h>
#include <cstdio>
#include <string>

std::string S(int v) { return std::to_string(v); }
std::string SL(long long v) { return std::to_string(v); }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void txt(double x, double y, std::string s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, std::string s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                                     // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}
void putL(const std::string &s, std::string &last, double left, double y,
          double w, double h, int col, int size) {
    if (s == last) return;
    wipe(left + w / 2 - 2, y, w, h);
    txtL(left, y, s, col, size);
    last = s;
}
void head() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("辗转相除 / 扩展欧几里得 / 快速幂", 0, 26);
}
// 换段时把标题以下擦一次（只在 ①→②、②→③ 各一次，不是每帧整屏 cls）
void newStage() { wipe(0, -45, 800, 710); }

/* ================= ① 辗转相除：矩形切割 ================= */
const int GA = 1071, GB = 462;
struct Sq { double x, y, s; int st; };
Sq sq[80];
double remX[80], remY[80], remW[80], remH[80];
int nsq = 0;
int eqA[8], eqB[8], eqQ[8], eqR[8], eqEnd[8], neq = 0;
int gGcd = 0;
double SC = 0.56, OX = -330, OY = -30;

int gcdRec(int a, int b) { return b == 0 ? a : gcdRec(b, a % b); }

// 先按辗转相除的顺序把每一刀的位置算出来（和 gcd 的递归完全一致）
void buildCut() {
    SC = 600.0 / GA;
    double rx = 0, ry = 0, rw = GA, rh = GB;
    int a = GA, b = GB, st = 0;
    while (b != 0) {
        int q = a / b, r = a % b;
        eqA[neq] = a; eqB[neq] = b; eqQ[neq] = q; eqR[neq] = r;
        bool hor = (rw >= rh);
        double side = hor ? rh : rw;
        for (int t = 0; t < q; t++) {
            sq[nsq].x = hor ? rx + t * side : rx;
            sq[nsq].y = hor ? ry : ry + t * side;
            sq[nsq].s = side; sq[nsq].st = st;
            remX[nsq] = hor ? rx + (t + 1) * side : rx;
            remY[nsq] = hor ? ry : ry + (t + 1) * side;
            remW[nsq] = hor ? rw - (t + 1) * side : rw;
            remH[nsq] = hor ? rh : rh - (t + 1) * side;
            nsq++;
        }
        eqEnd[neq] = nsq; neq++;
        if (hor) { rx += q * side; rw -= q * side; }
        else { ry += q * side; rh -= q * side; }
        a = b; b = r; st++;
    }
    gGcd = gcdRec(GA, GB);
}

int cutDone = 0, cutYellow = -1, remShown = -1, cutFinal = 0;
int eqDone[8];

int sqBaseCol(int i) { return sq[i].st == 0 ? 2 : (sq[i].st == 1 ? 11 : 14); }

// 切下来的正方形是累积的：只画新增的那一个，不擦也不重画前面的
void paintSq(int i, int col) {
    double s = sq[i].s * SC;
    double cx = OX + sq[i].x * SC + s / 2, cy = OY + sq[i].y * SC + s / 2;
    pen.setAngle(0);
    pen.pu().moveTo(cx, cy).pd().size(2).rr(s, s, col).r(s, s, 0);
    if (s > 46) pen.pu().moveTo(cx, cy).pd().c(15).text((int)sq[i].s, 15, 15);
}

// 剩余矩形的黄框往里缩 5px 画（外沿离边界 4px），擦的时候往里缩 3px：
// 既盖得干净黄框，又碰不到已画正方形伸进来的 1px 黑边和外框的 1.5px
void remBox(int idx, double &cx, double &cy, double &rw, double &rh) {
    rw = remW[idx] * SC; rh = remH[idx] * SC;
    cx = OX + remX[idx] * SC + rw / 2;
    cy = OY + remY[idx] * SC + rh / 2;
}
void paintRem(int idx) {
    double cx, cy, rw, rh; remBox(idx, cx, cy, rw, rh);
    pen.setAngle(0);
    pen.pu().moveTo(cx, cy).pd().size(2).c(5).r(rw - 10, rh - 10, 5);
}
void eraseRem(int idx) {
    double cx, cy, rw, rh; remBox(idx, cx, cy, rw, rh);
    wipe(cx, cy, rw - 6, rh - 6);
}

void cutStatic() {
    pen.setAngle(0);
    txtL(-350, 292, "① 辗转相除 gcd(1071,462)：在大矩形里切正方形，切到没有剩余为止", 0, 16);
    double W = GA * SC, H = GB * SC;
    pen.pu().moveTo(OX + W / 2, OY + H / 2).pd().size(3).c(0).r(W, H, 0);
}

void drawCut(int shown) {
    if (remShown >= 0) { eraseRem(remShown); remShown = -1; }
    if (cutYellow >= 0 && cutYellow != shown - 1) paintSq(cutYellow, sqBaseCol(cutYellow));
    for (int i = cutDone; i < shown; i++) paintSq(i, i == shown - 1 ? 5 : sqBaseCol(i));
    if (shown > cutDone) cutDone = shown;
    cutYellow = shown - 1;
    if (shown > 0 && shown < nsq && remW[shown - 1] > 0.5 && remH[shown - 1] > 0.5) {
        paintRem(shown - 1); remShown = shown - 1;
    }
    for (int e = 0; e < neq; e++) {
        if (shown >= eqEnd[e] && !eqDone[e]) {
            txtL(-350, -90 - e * 38, S(eqA[e]) + " = " + S(eqQ[e]) + " × " + S(eqB[e]) +
                 " + " + S(eqR[e]), e == neq - 1 ? 3 : 0, 19);
            txtL(120, -90 - e * 38, "切 " + S(eqQ[e]) + " 个边长 " + S(eqB[e]) + " 的正方形", 8, 14);
            eqDone[e] = 1;
        }
    }
    if (shown >= nsq && !cutFinal) {
        double s = sq[nsq - 1].s * SC;
        double cx = OX + sq[nsq - 1].x * SC + s / 2, cy = OY + sq[nsq - 1].y * SC + s / 2;
        pen.c(1); seg(cx, cy + 8, 250, 243, 2);
        pen.setAngle(0);
        txt(250, 256, "边长 " + S(gGcd) + " = gcd", 1, 15);
        txtL(-350, -225, "gcd(1071,462) = " + S(gGcd) + "（最后切出的小正方形边长）", 3, 22);
        txtL(-350, -265, "lcm = 1071 / " + S(gGcd) + " × 462 = " + S(GA / gGcd * GB), 0, 18);
        txtL(-350, -310, "余数变成 0，最后一个除数就是最大公约数", 8, 15);
        cutFinal = 1;
    }
}

/* ================= ② 扩展欧几里得：回代表格 ================= */
int ta[8], tb[8], tq[8], tx[8], ty[8], nd = 0;
std::string exMsg = "";
const double EXC[6] = {-290, -190, -90, 10, 110, 250};
const double EXW[6] = {80, 80, 80, 80, 80, 150};
int exFill[8][6], exRowDone[8], exFinal = 0;
std::string exTxt[8][6], lastExMsg;

int exgcd(int a, int b, int& x, int& y) {
    int d = nd++;
    ta[d] = a; tb[d] = b; tq[d] = b ? a / b : 0; tx[d] = 0; ty[d] = 0;
    if (b == 0) { x = 1; y = 0; tx[d] = 1; ty[d] = 0; return a; }
    int x1, y1;
    int g = exgcd(b, a % b, x1, y1);
    x = y1;
    y = x1 - (a / b) * y1;
    tx[d] = x; ty[d] = y;
    return g;
}

void exStatic() {
    pen.setAngle(0);
    txtL(-350, 292, "② 扩展欧几里得 exgcd(35,15)：递归到 b == 0，再回代 x = y1, y = x1 - (a/b)×y1", 0, 15);
    const char* hd[6] = {"a", "b", "a/b", "x", "y", "a*x + b*y"};
    for (int c = 0; c < 6; c++) txt(EXC[c], 235, hd[c], 8, 17);
    txtL(-350, 10, "递归方向：exgcd(35,15) → exgcd(15,5) → exgcd(5,0)", 2, 16);
    txtL(-350, -30, "边界 b == 0：x = 1, y = 0, gcd = a = 5", 3, 16);
    txtL(-350, -70, "回代公式：x = y1，y = x1 - (a/b) × y1", 0, 16);
    txtL(-350, -285, "扩展欧几里得常用来求乘法逆元、解 ax + by = c", 8, 15);
}

// 一个表格槽：格距 100×58，footprint 78×46，擦 80×50 不碰邻居和表头
void exCell(int d, int c, int fill, const std::string &s) {
    double y = 180 - d * 58;
    wipe(EXC[c], y, EXW[c], 50);
    pen.pu().moveTo(EXC[c], y).pd().size(2).rr(EXW[c] - 4, 44, fill).r(EXW[c] - 4, 44, 0);
    int tc = (fill == 3) ? 15 : 0;
    pen.pu().moveTo(EXC[c], y).pd().c(tc).text(s, tc, 17);
}

// visible：显示到第几行；fillFrom：从哪一行起 x、y 已经回代出来；hl：高亮行
void drawEx(int visible, int fillFrom, int hl) {
    for (int d = 0; d < visible; d++) {
        double y = 180 - d * 58;
        bool has = (d >= fillFrom);
        if (!exRowDone[d]) { txtL(-372, y, "d" + S(d), 8, 13); exRowDone[d] = 1; }
        for (int c = 0; c < 6; c++) {
            int fill = 15;
            if (d == hl) fill = 5;
            else if (has) fill = 3;
            std::string s = "?";
            if (c == 0) s = S(ta[d]);
            else if (c == 1) s = S(tb[d]);
            else if (c == 2) s = (tb[d] == 0 ? "-" : S(tq[d]));
            else if (c == 3) s = has ? S(tx[d]) : "?";
            else if (c == 4) s = has ? S(ty[d]) : "?";
            else s = has ? S(ta[d] * tx[d] + tb[d] * ty[d]) : "?";
            if (fill != exFill[d][c] || s != exTxt[d][c]) {
                exCell(d, c, fill, s);
                exFill[d][c] = fill; exTxt[d][c] = s;
            }
        }
    }
    putL(exMsg, lastExMsg, -350, -125, 520, 26, 2, 16);
    if (fillFrom == 0 && !exFinal) {
        txtL(-350, -180, "35 × " + S(tx[0]) + " + 15 × (" + S(ty[0]) + ") = " +
             S(35 * tx[0] + 15 * ty[0]), 3, 24);
        txtL(-350, -225, "gcd(35,15) = 5，验算 ax + by = 5 = gcd 成立", 0, 17);
        exFinal = 1;
    }
}

/* ================= ③ 快速幂：二进制位 + 平方链 ================= */
struct PStep { int bit; long long aBefore, rAfter, aAfter; };
PStep ps[40];
int nps = 0;
bool rec = false;
long long r1 = 0, r2 = 0, r3 = 0;
std::string powMsg = "";

const double PCX[4] = {-240, -80, 80, 240};
const double PRX[5] = {-300, -150, 0, 150, 300};
int bitFill[4], nodFill[4], resFill[5], sqrOn[4], mulOn[5];
std::string bitTxt[4], nodTxt[4], resTxt[5], lastPowMsg;
int powFinal = 0;

long long modPow(long long a, long long e, long long mod) {
    long long r = 1 % mod;
    while (e > 0) {
        if (rec) { ps[nps].bit = (int)(e & 1); ps[nps].aBefore = a; }
        if (e & 1) r = r * a % mod;
        a = a * a % mod;
        e >>= 1;
        if (rec) { ps[nps].rAfter = r; ps[nps].aAfter = a; nps++; }
    }
    return r;
}

void powStatic() {
    pen.setAngle(0);
    txtL(-350, 292, "③ 快速幂 3^13 mod 97：13 = (1101)二进制，每一位决定要不要乘进结果", 0, 16);
    txtL(-350, 245, "指数 e 的二进制位（低位在左）：", 0, 15);
    const char* lb[5] = {"初始 r=1", "bit0 后", "bit1 后", "bit2 后", "bit3 后"};
    for (int k = 0; k < 4; k++) {
        txt(PCX[k], 168, "2^" + S(k) + " = " + S(1 << k), 8, 13);
        txt(PCX[k], 60, "3^" + S(1 << k) + " mod 97", 8, 13);
    }
    txtL(-350, 15, "累乘结果 r（这一位是 1 就把 a 乘进去）：", 0, 15);
    for (int k = 0; k < 5; k++) txt(PRX[k], -75, lb[k], 8, 13);
    txtL(-350, -165, "每步：位是 1 就 r = r×a，然后 a = a×a、e 右移一位 —— 只要 O(log e) 步", 0, 15);
}

void bitCell(int k, int fill, const std::string &s) {
    wipe(PCX[k], 200, 84, 46);
    pen.pu().moveTo(PCX[k], 200).pd().size(2).rr(80, 44, fill).r(80, 44, 0);
    int tc = (fill == 3 || fill == 8) ? 15 : 0;
    pen.pu().moveTo(PCX[k], 200).pd().c(tc).text(s, tc, 22);
}
void chainLink(int k, int on) {
    double mid = (PCX[k - 1] + PCX[k]) / 2;
    wipe(mid, 118, 90, 44);
    pen.c(on ? 3 : 8); seg(PCX[k - 1] + 36, 105, PCX[k] - 36, 105, 2);
    pen.setAngle(0);
    txt(mid, 130, "平方", on ? 3 : 8, 12);
}
void chainNode(int k, int fill, const std::string &s) {
    wipe(PCX[k], 105, 70, 70);
    pen.pu().moveTo(PCX[k], 105).pd().size(2).oo(33, fill).o(33, 0);
    int tc = (fill == 2) ? 15 : 0;
    pen.pu().moveTo(PCX[k], 105).pd().c(tc).text(s, tc, 19);
}
void resLink(int k, int on) {
    double mid = (PRX[k - 1] + PRX[k]) / 2;
    wipe(mid, -40, 36, 8);
    pen.c(on ? 3 : 8); seg(PRX[k - 1] + 58, -40, PRX[k] - 58, -40, 2);
    pen.setAngle(0);
}
void resCell(int k, int fill, const std::string &s) {
    wipe(PRX[k], -40, 114, 48);
    pen.pu().moveTo(PRX[k], -40).pd().size(2).rr(110, 44, fill).r(110, 44, 0);
    int tc = (fill == 3) ? 15 : 0;
    pen.pu().moveTo(PRX[k], -40).pd().c(tc).text(s, tc, 20);
}

void drawPow(int done) {
    for (int k = 0; k < 4; k++) {
        bool on = k < done;
        int fill = on ? (ps[k].bit ? 3 : 8) : 15;
        if (k == done - 1) fill = 5;
        std::string s = on ? S(ps[k].bit) : "?";
        if (fill != bitFill[k] || s != bitTxt[k]) {
            bitCell(k, fill, s); bitFill[k] = fill; bitTxt[k] = s;
        }
    }
    for (int k = 0; k < 4; k++) {
        bool on = k < done;
        int fill = on ? 2 : 15;
        if (k == done - 1) fill = 5;
        if (k > 0) {
            int oi = on ? 1 : 0;
            if (oi != sqrOn[k]) { chainLink(k, on); sqrOn[k] = oi; }
        }
        std::string s = on ? SL(ps[k].aBefore) : "?";
        if (fill != nodFill[k] || s != nodTxt[k]) {
            chainNode(k, fill, s); nodFill[k] = fill; nodTxt[k] = s;
        }
    }
    long long rv[5];
    rv[0] = 1;
    for (int k = 0; k < 4; k++) rv[k + 1] = (k < done) ? ps[k].rAfter : 0;
    for (int k = 0; k < 5; k++) {
        bool on = (k == 0) || (k <= done);
        int fill = on ? 3 : 15;
        if (k == done) fill = 5;
        if (k > 0) {
            int oi = on ? 1 : 0;
            if (oi != mulOn[k]) { resLink(k, on); mulOn[k] = oi; }
        }
        std::string s = on ? SL(rv[k]) : "?";
        if (fill != resFill[k] || s != resTxt[k]) {
            resCell(k, fill, s); resFill[k] = fill; resTxt[k] = s;
        }
    }
    putL(powMsg, lastPowMsg, -350, -120, 520, 26, 2, 16);
    if (done >= nps && !powFinal) {
        txtL(-350, -215, "2^10 mod 1000 = " + SL(r1) + "    3^13 mod 97 = " + SL(r2) +
             "    7^0 mod 5 = " + SL(r3), 3, 20);
        txtL(-350, -260, "7^0：e = 0，循环一次都不进，直接返回 1 % 5 = 1", 8, 15);
        txtL(-350, -300, "乘法次数：4 次平方 + 3 次乘入 = 7 次（连乘要 13 次）", 0, 15);
        powFinal = 1;
    }
}

int main() {
    pen.speed(10);
    head();

    /* ---- ① 辗转相除 ---- */
    buildCut();
    for (int e = 0; e < 8; e++) eqDone[e] = 0;
    cutStatic();
    drawCut(0); wait(0.35);
    for (int i = 1; i <= nsq; i++) { drawCut(i); wait(0.09); }
    drawCut(nsq); wait(0.5);

    /* ---- ② 扩展欧几里得 ---- */
    newStage();
    nd = 0;
    int xx = 0, yy = 0;
    int g2 = exgcd(35, 15, xx, yy);
    for (int d = 0; d < 8; d++) {
        exRowDone[d] = 0;
        for (int c = 0; c < 6; c++) exFill[d][c] = -1;
    }
    exStatic();
    exMsg = "先往下递归，x、y 还不知道（表里是 ?）";
    drawEx(0, nd, -1); wait(0.3);
    for (int d = 0; d < nd; d++) {
        exMsg = "递归第 " + S(d) + " 层：exgcd(" + S(ta[d]) + ", " + S(tb[d]) + ")";
        drawEx(d + 1, nd, d); wait(0.15);
    }
    exMsg = "到边界 b == 0：x = 1, y = 0，开始往回代";
    drawEx(nd, nd - 1, nd - 1); wait(0.25);
    for (int d = nd - 2; d >= 0; d--) {
        exMsg = "回代第 " + S(d) + " 层：x = y1 = " + S(tx[d]) + "，y = x1 - " + S(tq[d]) +
                "×y1 = " + S(ty[d]);
        drawEx(nd, d, d); wait(0.3);
    }
    exMsg = "回代完成：gcd = " + S(g2) + "，x = " + S(xx) + "，y = " + S(yy);
    drawEx(nd, 0, -1); wait(0.4);

    /* ---- ③ 快速幂（顺序同原版：2^10、3^13、7^0） ---- */
    newStage();
    r1 = modPow(2, 10, 1000);
    rec = true; nps = 0;
    r2 = modPow(3, 13, 97);
    rec = false;
    r3 = modPow(7, 0, 5);
    for (int k = 0; k < 4; k++) { bitFill[k] = -1; nodFill[k] = -1; sqrOn[k] = -1; }
    for (int k = 0; k < 5; k++) { resFill[k] = -1; mulOn[k] = -1; }
    powStatic();
    powMsg = "r 从 1 开始，e = 13 = (1101)二进制";
    drawPow(0); wait(0.3);
    for (int k = 0; k < nps; k++) {
        powMsg = "第 " + S(k) + " 位 = " + S(ps[k].bit);
        powMsg += ps[k].bit ? "：r = r×a = " + SL(ps[k].rAfter) : "：不乘，r 不变";
        powMsg += "；a 平方 → " + SL(ps[k].aAfter);
        drawPow(k + 1); wait(0.3);
    }
    drawPow(nps); wait(0.6);

    printf("gcd=%d lcm=%d；exgcd(35,15): x=%d y=%d；2^10%%1000=%lld 3^13%%97=%lld 7^0%%5=%lld\\n",
           gGcd, GA / gGcd * GB, xx, yy, r1, r2, r3);
    return 0;
}
`,
  },
  '大整数阶乘（数组存十进制位）（画图版）': {
    group: 'GoC 可视化·数学与位运算',
    stdin: '',
    code: `// 大整数阶乘的可视化版（局部重绘）：算法与数据同原版（digits[0] 是个位，N = 30，
// 每次乘 k 时逐位做「乘 + 进位」，最后统一处理高位）。
// 画面上一格 = 一个十进制位，从左到右是高位→低位（个位在最右）。
// 颜色：蓝 = 已存好的位，黄 = 这一帧正在算的位，绿 = 这一步新进出来的高位，
//       白底灰框 = 还没用到的格子；橙色箭头 = 往高位的进位。
// 绘制：标题 / 下标 / 高低位标签 / 进度条外框 / 说明只画一次；33 个数字格、进位箭头、
//       结果串各自脏跟踪，变了才 setAngle(0)+clsRec 擦自己的槽再重画；进度条只增不减，
//       不透明实心原位盖旧，检查点文字只追加。
#include <goc.h>
#include <cstdio>
#include <string>

const int MAXD = 200;
const int SHOW = 33;            // 30! 有 33 位，画面上固定画 33 个格子
const int N = 30;
int digits[MAXD];
int len = 1;

int curK = 1, curI = -1, carryIn = 0, arrowVal = 0;
int greenFrom = SHOW;           // 从这一位起是新增的（画绿）
std::string msg = "";
std::string ms[4];              // 5! 10! 20! 30! 四个检查点（同原版的 printf 位置）
int nms = 0;

std::string S(int v) { return std::to_string(v); }

void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void txt(double x, double y, std::string s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, std::string s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                                     // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}
void putL(const std::string &s, std::string &last, double left, double y,
          double w, double h, int col, int size) {
    if (s == last) return;
    wipe(left + w / 2 - 2, y, w, h);
    txtL(left, y, s, col, size);
    last = s;
}
void putC(const std::string &s, std::string &last, double cx, double y,
          double w, double h, int col, int size) {
    if (s == last) return;
    wipe(cx, y, w, h);
    txt(cx, y, s, col, size);
    last = s;
}
std::string bigStr() {
    std::string s = "";
    for (int i = len - 1; i >= 0; i--) s += char('0' + digits[i]);
    return s;
}
double slotX(int di) { return -352 + (SHOW - 1 - di) * 22; }

// ---- 脏跟踪 ----
int dFill[SHOW], dOc[SHOW], dVal[SHOW];
std::string lastKL, lastMsg, lastBig;
int arrowI = -1, arrowV = -1, lastK = -1, msDone = 0;

// 一个数字格：格距 22，footprint 22×44，擦 22×46 正好盖住自己且不啃邻居
void drawDigit(int di, int fill, int oc, int val) {
    double x = slotX(di);
    wipe(x, 130, 22, 46);
    pen.pu().moveTo(x, 130).pd().size(2).rr(20, 42, fill).r(20, 42, oc);
    if (val >= 0) {
        int tc = (fill == 5) ? 0 : 15;
        pen.pu().moveTo(x, 130).pd().c(tc).text(val, tc, 15);
    }
}

// 进位箭头：从当前位指向左边的高一位（槽 50×32，在格子上方、说明文字下方）
void drawArrow(int i, int val) {
    double x1 = slotX(i), x2 = slotX(i + 1);
    pen.c(14);
    seg(x1, 172, x2 + 3, 172, 3);
    seg(x2 + 3, 172, x2 + 11, 177, 2);
    seg(x2 + 3, 172, x2 + 11, 167, 2);
    txt((x1 + x2) / 2, 186, "进位 " + S(val), 14, 12);
}

// 每帧：只重画变了的数字格 / 箭头 / 文字，静态背景不再重画
void draw() {
    putL("乘数 k = " + S(curK) + "    当前位数 len = " + S(len), lastKL, -350, 245, 380, 30, 0, 20);
    putL(msg, lastMsg, -350, 210, 520, 24, 2, 16);
    for (int di = 0; di < SHOW; di++) {
        bool used = di < len;
        int fill = 15, oc = 8, val = -1;
        if (used) { fill = 2; oc = 2; val = digits[di]; }
        if (used && di >= greenFrom) { fill = 3; oc = 3; }
        if (di == curI) { fill = 5; oc = 1; }
        if (fill != dFill[di] || oc != dOc[di] || val != dVal[di]) {
            drawDigit(di, fill, oc, val);
            dFill[di] = fill; dOc[di] = oc; dVal[di] = val;
        }
    }
    int want = (curI >= 0 && arrowVal > 0 && curI + 1 < SHOW) ? curI : -1;
    if (want != arrowI || arrowVal != arrowV) {
        if (arrowI >= 0) wipe(slotX(arrowI) - 11, 180, 50, 32);
        if (want >= 0) drawArrow(want, arrowVal);
        arrowI = want; arrowV = arrowVal;
    }
    putC(bigStr(), lastBig, 0, 25, 420, 30, 0, 20);
    // 进度条：k 从 2 乘到 30，填充只增不减，实心原位盖旧即可
    if (curK != lastK) {
        double fw = 700.0 * (curK - 1) / (N - 1);
        if (fw > 1) pen.pu().moveTo(-350 + fw / 2, -25).pd().size(2).rr(fw, 12, 3);
        lastK = curK;
    }
    for (int i = msDone; i < nms; i++) txtL(-350, -95 - i * 40, ms[i], 10, 16);
    msDone = nms;
}

// 静态背景只画一次，全部在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("大整数阶乘（数组存十进制位）", 0, 26);
    txtL(-350, 292, "digits[0] 是个位；乘法从右边的个位开始，往左一位一位进位", 0, 15);
    for (int di = 0; di < SHOW; di++) if (di % 5 == 0) txt(slotX(di), 95, S(di), 8, 11);
    txt(-352, 78, "高位", 8, 11);
    txt(352, 78, "个位", 8, 11);
    txtL(-350, 55, "当前结果（高位 → 低位）：", 8, 14);
    txtL(-350, -50, "进度：k 从 2 一直乘到 30", 8, 14);
    pen.pu().moveTo(0, -25).pd().size(2).c(8).r(700, 14, 8);
    txtL(-350, -265, "int 装不下 30!，long long 也只到 20!，所以用数组按十进制位存", 0, 15);
    txtL(-350, -305, "每位：t = digits[i]×k + carry，本位存 t%10，进位 t/10 交给高一位", 8, 14);
}

int main() {
    pen.speed(10);
    for (int i = 0; i < MAXD; ++i) digits[i] = 0;
    for (int i = 0; i < SHOW; ++i) { dFill[i] = -1; dOc[i] = -1; dVal[i] = -1; }
    digits[0] = 1;
    len = 1;
    drawStatic();
    msg = "初始：digits[0] = 1，也就是 1! = 1";
    draw(); wait(0.5);

    for (int k = 2; k <= N; ++k) {
        curK = k;
        greenFrom = SHOW;
        int lenBefore = len;
        int carry = 0;
        int step = (lenBefore + 2) / 3;      // 位数多了就隔几位画一帧，控制总时长
        if (step < 1) step = 1;
        for (int i = 0; i < lenBefore; ++i) {
            int old = digits[i];
            int t = old * k + carry;
            curI = i; carryIn = carry;
            digits[i] = t % 10;
            carry = t / 10;
            arrowVal = carry;
            msg = "i = " + S(i) + "：t = " + S(old) + "×" + S(k) + " + " + S(carryIn) +
                  " = " + S(t) + " → 本位 " + S(digits[i]) + "，进位 " + S(carry);
            if (k <= 8 || i % step == 0 || i == lenBefore - 1) {
                draw();
                wait(k <= 8 ? 0.07 : 0.03);
            }
        }
        while (carry) { digits[len++] = carry % 10; carry /= 10; }
        curI = -1; arrowVal = 0;
        greenFrom = lenBefore;
        msg = "乘完 " + S(k) + "：" + S(k) + "! 有 " + S(len) + " 位";
        if (len > lenBefore) msg += "，新增 " + S(len - lenBefore) + " 位（绿）";
        if (k <= 8 || k % 5 == 0 || k == N) { draw(); wait(k <= 8 ? 0.05 : 0.03); }
        if (k == 5 || k == 10 || k == 20 || k == 30) {
            ms[nms++] = S(k) + "! = " + bigStr() + "（" + S(len) + " 位）";
            draw(); wait(0.05);
        }
    }
    curI = -1; arrowVal = 0; greenFrom = 0;
    msg = "30! 算完：一共 " + S(len) + " 位，数组里从右往左就是个位到最高位";
    draw(); wait(1.2);
    printf("%d! = %s（共 %d 位）\\n", N, bigStr().c_str(), len);
    return 0;
}
`,
  },
  '递归 + 大栈（画图版）': {
    group: 'GoC 可视化·基础与STL',
    stdin: '',
    code: `// 递归 + 大栈的可视化版（局部重绘）：算法与数据同原版（fib(n) = fib(n-1) + fib(n-2)，
// 外加 1M 个 double 放堆上求和，用来对比「栈放不下就放堆」）。
// 原版的 n 从 stdin 读，这里固定 n = 6 便于动画：fib(6) = 8，25 次调用，最大栈深 6。
// 左边画调用栈：栈帧从底往上一帧一帧压入（每帧标函数名 + 参数），到递归边界再逐帧弹出；
// 右边画递归树，节点里是 n，返回后在节点下面写出 fib(n) 的值。
// 颜色：黄 = 正在栈上（还没返回），绿 = 已返回，白底灰框 = 还没调用到。
// 绘制：标题 / 说明 / 栈底线 / 堆说明只画一次；栈帧、树节点、树边、左侧文字各自脏跟踪，
//       擦掉的矩形登记下来，被擦到的邻居节点 / 边补画（边先画、节点后画），不整屏 cls。
#include <goc.h>
#include <cstdio>
#include <string>

const int N = 6;
struct Node { int n, dep, l, r, par; double x, y; long long val; bool done; };
Node nd[64];
int nn = 0;
double leafCur = -50;

std::string S(int v) { return std::to_string(v); }
std::string SL(long long v) { return std::to_string(v); }
std::string SD(double v) {
    char buf[40];
    snprintf(buf, sizeof buf, "%.1f", v);
    return std::string(buf);
}
void seg(double x1, double y1, double x2, double y2, double w) {
    double dx = x2 - x1, dy = y2 - y1, L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(w).setAngle(atan2_deg(dx, dy)).fd(L);
}
void txt(double x, double y, std::string s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, std::string s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

// 先按 fib 的调用结构建一棵递归树（先序编号，和真正的递归顺序一一对应）
int build(int n, int dep, int par) {
    int id = nn++;
    nd[id].n = n; nd[id].dep = dep; nd[id].par = par;
    nd[id].l = -1; nd[id].r = -1; nd[id].val = 0; nd[id].done = false;
    nd[id].y = 205 - dep * 86;
    if (n >= 2) { nd[id].l = build(n - 1, dep + 1, id); nd[id].r = build(n - 2, dep + 1, id); }
    return id;
}
double layoutX(int id) {
    if (nd[id].l < 0) { nd[id].x = leafCur; leafCur += 33; return nd[id].x; }
    double a = layoutX(nd[id].l), b = layoutX(nd[id].r);
    nd[id].x = (a + b) / 2;
    return nd[id].x;
}

// 把真实递归的每一次压栈 / 弹栈录成事件，再回放成动画
struct Ev { int id; int push; long long val; };
Ev ev[128];
int nev = 0, cursor = 0;

unsigned long long fib(int n) {
    int id = cursor++;
    ev[nev].id = id; ev[nev].push = 1; ev[nev].val = 0; nev++;
    unsigned long long v;
    if (n < 2) v = n; else v = fib(n - 1) + fib(n - 2);
    ev[nev].id = id; ev[nev].push = 0; ev[nev].val = (long long)v; nev++;
    return v;
}

int stk[16], sn = 0, maxDepth = 0, calls = 0;
std::string act = "";
double heapSum = 0;
unsigned long long fibN = 0;

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 900;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    pen.setAngle(0);                       // 不 cls 了，角度得自己归零
    pen.pu().moveTo(cx, cy).pd().clsRec(w, h);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

void putL(const std::string &s, std::string &last, double left, double y,
          double w, double h, int col, int size) {
    if (s == last) return;
    eraseBox(left + w / 2 - 2, y, w, h);
    txtL(left, y, s, col, size);
    last = s;
}

// ---- 脏跟踪状态 ----
const int MAXF = 6;                        // fib(6) 的最大栈深就是 6
int fOcc[MAXF], fN[MAXF], fFill[MAXF], fD[MAXF];
int nFill[64], nRing[64], nDone[64], eCol[64];
long long nVal[64];
int lFill[64], lRing[64], lDone[64], leCol[64];
long long lVal[64];
int dn[64], pn[64], de[64], pe[64];
std::string lastDep, lastMax, lastCalls, lastAct, lastFib;

// 树边两端各缩进 15（正好被节点圆盖住），这样擦边和擦节点的槽互不牵连
void edgePts(int i, double &x1, double &y1, double &x2, double &y2) {
    int p = nd[i].par;
    double dx = nd[i].x - nd[p].x, dy = nd[i].y - nd[p].y;
    double L = sqrt(dx * dx + dy * dy);
    double t = 15.0 / L;
    x1 = nd[p].x + dx * t; y1 = nd[p].y + dy * t;
    x2 = nd[i].x - dx * t; y2 = nd[i].y - dy * t;
}

void paintEdge(int i) {
    double x1, y1, x2, y2; edgePts(i, x1, y1, x2, y2);
    pen.c(eCol[i]);
    seg(x1, y1, x2, y2, 2);
}

// 节点槽 34×54：圆 r15+1、下面还有 "=值" 文字；叶子横距 33，擦到邻居就补画
void paintNode(int i) {
    double x = nd[i].x, y = nd[i].y;
    int fill = nFill[i];
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().size(2).oo(15, fill).o(15, nRing[i]);
    txt(x, y, S(nd[i].n), fill == 3 ? 15 : 0, 14);
    if (nDone[i]) txt(x, y - 26, "=" + SL(nVal[i]), 10, 12);
}

void paintFrame(int k) {
    double y = -246 + k * 50;
    int id = stk[k];
    int fill = (k == sn - 1) ? 5 : 2;
    pen.setAngle(0);
    pen.pu().moveTo(-230, y).pd().size(2).rr(230, 44, fill).r(230, 44, 0);
    txt(-230, y, "fib(n = " + S(nd[id].n) + ")", fill == 5 ? 0 : 15, 16);
}

// 栈底线是静态的，但 0 号帧的槽压到它：擦完就地补一整条（同路径同线宽同色）
void paintBase() { pen.c(0); seg(-350, -270, -110, -270, 4); }

// 静态背景只画一次，全部在动态槽位之外
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("递归 + 大栈", 0, 26);
    txtL(-350, 292, "左：调用栈（栈底在下）  右：递归树   黄 = 在栈上，绿 = 已返回", 0, 15);
    txtL(-350, 250, "调用栈", 0, 18);
    paintBase();
    txtL(-350, -288, "栈底（main 的帧在更下面）", 8, 12);
    txtL(-60, 250, "递归树 fib(" + S(N) + ")", 0, 18);
    txtL(-350, -320, "堆：double* buf = new double[1<<20] —— 8 MB，栈上放不下（会爆栈）", 0, 14);
    txtL(-350, -350, "1M 个 double 的和 = " + SD(heapSum) + "（0.5 × 1048576）", 10, 14);
}

void draw() {
    erN = 0;
    // 左侧文字槽
    putL("栈深度 = " + S(sn), lastDep, -350, 215, 150, 32, 2, 22);
    putL("最大深度 = " + S(maxDepth), lastMax, -350, 185, 130, 24, 8, 15);
    putL("调用次数 = " + S(calls) + " / " + S(nn), lastCalls, -350, 158, 150, 24, 8, 15);
    putL(act, lastAct, -350, 112, 250, 26, 1, 16);
    putL((sn == 0 && calls > 0) ? ("fib(" + S(N) + ") = " + SL((long long)fibN)) : std::string(""),
         lastFib, -350, 60, 200, 32, 3, 26);

    // 栈帧：占位 / 参数 / 颜色变了才擦槽重画
    int baseFix = 0;
    for (int k = 0; k < MAXF; k++) {
        int occ = (k < sn) ? 1 : 0;
        int nv = occ ? nd[stk[k]].n : -1;
        int nf = occ ? ((k == sn - 1) ? 5 : 2) : -1;
        fD[k] = (occ != fOcc[k] || nv != fN[k] || nf != fFill[k]) ? 1 : 0;
        if (fD[k] && fOcc[k]) {
            eraseBox(-230, -246 + k * 50, 234, 48);
            if (k == 0) baseFix = 1;
        }
    }

    // 树节点与树边的目标状态
    for (int i = 0; i < nn; i++) {
        bool on = false;
        for (int k = 0; k < sn; k++) if (stk[k] == i) on = true;
        nFill[i] = nd[i].done ? 3 : (on ? 5 : 15);
        nRing[i] = on ? 1 : 0;
        nDone[i] = nd[i].done ? 1 : 0;
        nVal[i] = nd[i].val;
        dn[i] = (nFill[i] != lFill[i] || nRing[i] != lRing[i] ||
                 nDone[i] != lDone[i] || nVal[i] != lVal[i]) ? 1 : 0;
        pn[i] = dn[i];
        if (nd[i].par >= 0) {
            eCol[i] = nd[i].done ? 3 : 8;
            de[i] = (eCol[i] != leCol[i]) ? 1 : 0;
            pe[i] = de[i];
        } else { de[i] = 0; pe[i] = 0; }
    }

    // 擦：脏节点槽 + 脏边走廊
    for (int i = 0; i < nn; i++) if (dn[i]) eraseBox(nd[i].x, nd[i].y - 8, 34, 54);
    for (int i = 0; i < nn; i++) {
        if (!de[i] || nd[i].par < 0) continue;
        double x1, y1, x2, y2; edgePts(i, x1, y1, x2, y2);
        eraseSeg(x1, y1, x2, y2);
    }

    // 补画：被擦到的边、被擦到的节点，以及补画边会盖到的两个端点
    for (int pass = 0; pass < 2; pass++) {
        for (int i = 0; i < nn; i++) {
            if (nd[i].par < 0 || pe[i]) continue;
            double x1, y1, x2, y2; edgePts(i, x1, y1, x2, y2);
            if (segHitEr(x1, y1, x2, y2, 3)) pe[i] = 1;
        }
        for (int i = 0; i < nn; i++)
            if (!pn[i] && rectHitEr(nd[i].x, nd[i].y - 8, 34, 54)) pn[i] = 1;
        for (int i = 0; i < nn; i++)
            if (pe[i] && nd[i].par >= 0) { pn[i] = 1; pn[nd[i].par] = 1; }
    }

    // 画：栈底线 -> 边 -> 节点（升序，后画的盖住先画的）-> 栈帧
    if (baseFix) paintBase();
    for (int i = 0; i < nn; i++) if (pe[i] && nd[i].par >= 0) paintEdge(i);
    for (int i = 0; i < nn; i++) if (pn[i]) paintNode(i);
    for (int k = 0; k < MAXF; k++) if (fD[k] && k < sn) paintFrame(k);

    // 记下这一帧的状态
    for (int k = 0; k < MAXF; k++) {
        fOcc[k] = (k < sn) ? 1 : 0;
        fN[k] = (k < sn) ? nd[stk[k]].n : -1;
        fFill[k] = (k < sn) ? ((k == sn - 1) ? 5 : 2) : -1;
    }
    for (int i = 0; i < nn; i++) {
        lFill[i] = nFill[i]; lRing[i] = nRing[i]; lDone[i] = nDone[i]; lVal[i] = nVal[i];
        if (nd[i].par >= 0) leCol[i] = eCol[i];
    }
}

int main() {
    pen.speed(10);
    // 同原版：1M 个 double 放堆上（栈只有几 MB，放不下）
    const int M = 1 << 20;
    double* buf = new double[M];
    for (int i = 0; i < M; i++) buf[i] = 0.5;
    double s = 0;
    for (int i = 0; i < M; i++) s += buf[i];
    delete[] buf;
    heapSum = s;

    build(N, 0, -1);
    layoutX(0);
    fibN = fib(N);                       // 先真跑一遍，录下压栈/弹栈事件
    for (int i = 0; i < nn; i++) { nd[i].done = false; nd[i].val = 0; }
    for (int i = 0; i < 64; i++) { lFill[i] = -1; lRing[i] = -1; lDone[i] = -1; leCol[i] = -1; lVal[i] = -1; }
    for (int k = 0; k < MAXF; k++) { fOcc[k] = 0; fN[k] = -1; fFill[k] = -1; }
    drawStatic();
    act = "准备调用 fib(" + S(N) + ")，栈是空的";
    draw(); wait(0.4);
    for (int e = 0; e < nev; e++) {
        int id = ev[e].id;
        if (ev[e].push) {
            stk[sn++] = id;
            calls++;
            if (sn > maxDepth) maxDepth = sn;
            act = "压入 fib(" + S(nd[id].n) + ")";
        } else {
            sn--;
            nd[id].done = true;
            nd[id].val = ev[e].val;
            act = "弹出 fib(" + S(nd[id].n) + ") → 返回 " + SL(ev[e].val);
        }
        draw(); wait(0.05);
    }
    act = "栈空了，fib(" + S(N) + ") = " + SL((long long)fibN);
    draw(); wait(1.0);
    printf("fib(%d) = %llu；调用 %d 次，最大栈深 %d；1M 个 double 的和 = %.1f\\n",
           N, fibN, calls, maxDepth, heapSum);
    return 0;
}
`,
  },
  '多种基本数据类型初始化数组（画图版）': {
    group: 'GoC 可视化·基础与STL',
    stdin: '',
    code: `// 多种基本数据类型初始化数组的可视化版（局部重绘）：算法与数据同原版（for i = 0..4
// 依次写 numbers[i] = i+1、decimals[i] = i+0.5、characters[i] = 'a'+i、bools[i] = i%2==0）。
// 原版用 float，这里按要求画 int / long long / double / char / bool 五行；
// long long 一行写同样的 i+1，用来对比「同样的值，类型不同占的字节数不同」。
// 每个小格 = 1 字节：int 4 格、long long 8 格、double 8 格、char 1 格、bool 1 格。
// 颜色：白底灰框 = 还没初始化，黄 = 这一帧正在写，各类型的本色 = 已写好。
// 绘制：标题 / 类型名 / sizeof / 赋值语句 / 下标 / 说明只画一次；25 个元素槽各自脏跟踪，
//       变了才 setAngle(0)+clsRec 擦掉自己那一格（含字节格与值文字）再重画，不整屏 cls。
#include <goc.h>
#include <cstdio>
#include <string>

int numbers[5];
long long bigs[5];
double decimals[5];
char characters[5];
bool bools[5];
bool written[5][5];
int curT = -1, curI = -1;
std::string msg = "";

const char* TNAME[5] = {"int", "long long", "double", "char", "bool"};
const char* TCODE[5] = {"numbers[i] = i+1", "bigs[i] = i+1", "decimals[i] = i+0.5",
                        "characters[i] = 'a'+i", "bools[i] = i%2==0"};
const int TCOL[5] = {2, 11, 12, 14, 10};

std::string S(int v) { return std::to_string(v); }
std::string SL(long long v) { return std::to_string(v); }
std::string SD(double v) {
    char buf[40];
    snprintf(buf, sizeof buf, "%.1f", v);
    return std::string(buf);
}
void txt(double x, double y, std::string s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}
void txtL(double x, double y, std::string s, int col, int size) {
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}
void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);                                     // 不 cls 了，角度得自己归零
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}
void putL(const std::string &s, std::string &last, double left, double y,
          double w, double h, int col, int size) {
    if (s == last) return;
    wipe(left + w / 2 - 2, y, w, h);
    txtL(left, y, s, col, size);
    last = s;
}
int bytesOf(int t) {
    if (t == 0) return (int)sizeof(int);
    if (t == 1) return (int)sizeof(long long);
    if (t == 2) return (int)sizeof(double);
    if (t == 3) return (int)sizeof(char);
    return (int)sizeof(bool);
}
std::string valStr(int t, int i) {
    if (t == 0) return S(numbers[i]);
    if (t == 1) return SL(bigs[i]);
    if (t == 2) return SD(decimals[i]);
    if (t == 3) return std::string(1, characters[i]);
    return bools[i] ? "true" : "false";
}

// ---- 脏跟踪：一个元素 = nb 个字节格 + 值文字 ----
int mFill[5][5], mOc[5][5], mHas[5][5];
std::string lastMsg;

// 元素槽：宽 nb*13+2（格距 nb*13+8，左右各留 6px 不啃邻居），
// 高 58 盖住字节格（y-6.75..y+26.75）和值文字（y-28..y-12），下标 [i] 在 y-40 之外
void drawElem(int t, int i, int fill, int oc, int has) {
    double y = 215 - t * 100;
    int nb = bytesOf(t);
    double pitch = nb * 13 + 8;
    double x0 = -215 + i * pitch;
    double cx = x0 + nb * 6.5;
    wipe(cx, y - 1, nb * 13 + 2, 58);
    for (int b = 0; b < nb; b++) {
        pen.pu().moveTo(x0 + b * 13 + 6.5, y + 10).pd().size(1.5)
           .rr(12, 32, fill).r(12, 32, oc);
    }
    if (t == 3 || t == 4) {
        // char / bool 只有一格宽，值直接写在格子里
        if (has) txt(cx, y + 10, t == 3 ? valStr(t, i) : (bools[i] ? "1" : "0"),
                     fill == 5 ? 0 : 15, 14);
        if (t == 3 && has) txt(cx, y - 20, S((int)characters[i]), 8, 11);
    } else if (has) {
        txt(cx, y - 20, valStr(t, i), 0, 15);
    }
}

// 每帧：只重画「颜色 / 有无值」变了的元素，静态背景不再重画
void draw() {
    for (int t = 0; t < 5; t++) {
        for (int i = 0; i < 5; i++) {
            bool cur = (t == curT && i == curI);
            bool has = written[t][i] || cur;
            int fill = 15, oc = 8;
            if (written[t][i]) { fill = TCOL[t]; oc = TCOL[t]; }
            if (cur) { fill = 5; oc = 1; }
            int hv = has ? 1 : 0;
            if (fill != mFill[t][i] || oc != mOc[t][i] || hv != mHas[t][i]) {
                drawElem(t, i, fill, oc, hv);
                mFill[t][i] = fill; mOc[t][i] = oc; mHas[t][i] = hv;
            }
        }
    }
    putL(msg, lastMsg, -350, -265, 520, 28, 2, 17);
}

// 静态背景只画一次：标题 / 地址说明 / 每行类型名、sizeof、赋值语句、下标 / 底部说明
void drawStatic() {
    pen.setAngle(0);
    pen.pu().moveTo(-350, 330).pd().c(0).textL("多种基本数据类型初始化数组", 0, 26);
    txtL(-350, 292, "数组的元素类型是定死的，声明时就得说清楚放什么类型", 0, 15);
    txtL(-215, 262, "地址从低到高 →（每个小格 = 1 字节）", 8, 13);
    for (int t = 0; t < 5; t++) {
        double y = 215 - t * 100;
        int nb = bytesOf(t);
        double pitch = nb * 13 + 8;
        txtL(-372, y + 16, TNAME[t], 0, 20);
        txtL(-372, y - 6, "sizeof = " + S(nb) + " 字节", 8, 13);
        txtL(-372, y - 28, TCODE[t], 8, 12);
        for (int i = 0; i < 5; i++) txt(-215 + i * pitch + nb * 6.5, y - 40, "[" + S(i) + "]", 8, 11);
        if (t == 3) txtL(-90, y + 10, "char 存的是编码：'a' = 97，不是字符本身", 14, 14);
        if (t == 4) txtL(-90, y + 10, "bool 只占 1 字节：1 = true，0 = false", 10, 14);
    }
    txtL(-350, -300, "5 个元素合计：int 20 字节，long long 40 字节，double 40 字节，char 5 字节，bool 5 字节", 0, 14);
    txtL(-350, -335, "同样 5 个元素，类型不同占的内存差 8 倍", 8, 14);
}

int main() {
    pen.speed(10);
    for (int t = 0; t < 5; t++)
        for (int i = 0; i < 5; i++) {
            written[t][i] = false;
            mFill[t][i] = -1; mOc[t][i] = -1; mHas[t][i] = -1;
        }
    drawStatic();
    msg = "声明了 5 个数组，各 5 个元素，还没初始化（白格）";
    draw(); wait(0.5);
    for (int i = 0; i < 5; i++) {
        for (int t = 0; t < 5; t++) {
            curT = t; curI = i;
            if (t == 0) numbers[i] = i + 1;
            else if (t == 1) bigs[i] = i + 1;
            else if (t == 2) decimals[i] = i + 0.5;
            else if (t == 3) characters[i] = 'a' + i;
            else bools[i] = (i % 2 == 0);
            msg = "i = " + S(i) + "：写 " + TNAME[t] + "[" + S(i) + "] = " + valStr(t, i);
            draw(); wait(0.05);          // 黄：正在往这一格写
            written[t][i] = true;
            draw(); wait(0.03);          // 变成本色：写好了
        }
    }
    curT = -1; curI = -1;
    msg = "初始化完成：characters[0] 的值是 " + S((int)characters[0]) + "（'a' 的编码）";
    draw(); wait(1.0);
    printf("int 1..5 / long long 1..5 / double 0.5..4.5 / char a..e / bool 1,0,1,0,1；characters[0]=%d\\n",
           (int)characters[0]);
    return 0;
}
`,
  },
  'STL 容器与算法（画图版）': {
    group: 'GoC 可视化·基础与STL',
    stdin: '',
    code: `// STL 容器与算法（局部重绘）：vector 画成一排格子，紫线标出 capacity 的范围，格子下面写下标。
// 颜色约定：黄=正在处理（比较 / 扫描 / 刚 push 进来的元素），绿=排好或命中，
//           橙=扩容时从旧块搬过来的元素，灰=扫过没命中 / 扩容前的旧内存块。
// 算法与数据和原版一致：{5,3,9,1,7,2,8} + std::sort + std::accumulate + std::minmax_element；
// 另外把 push_back 的翻倍扩容、std::find 的线性扫描也画出来
//（sort 用带画面的比较器、find 用 find_if 的谓词、accumulate 用自定义累加 op，算法本体仍是 STL 的）。
// 绘制：标题 / 副标题 / 图例 / 下标 / min-max 标签只画一次；16 个格子、旧内存块、capacity 标注、
//       橙色搬移箭头和 9 行文字各自脏跟踪，状态变了才 setAngle(0) + clsRec 擦自己的槽再重画，
//       擦除框都落在动态槽位里，不碰静态图形，也不整屏 cls。
#include <goc.h>
#include <cstdio>
#include <cstdint>
#include <string>
#include <vector>
#include <algorithm>
#include <numeric>

std::vector<int> v;
int st[16];                        // 格子状态：0 普通 1 黄 2 绿 3 灰 4 橙 5 空槽
int ghostCap = 0, ghostN = 0, ghostVal[16];   // 扩容前的旧内存块
int minIdx = -1, maxIdx = -1;
int scanPos = 0, accPos = 0, target = 7;
int snap[16], snapN = 0;           // 上一次比较时的数组快照，用来找出被搬动的格子
std::string phase = "", msg = "", note = "";
std::string rSort = "", rFind = "", rSum = "", rMM = "";

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

// 不 cls 了，角度得自己归零：rr / r / oo / clsRec 都跟着笔朝向转
void cell(double x, double y, double w, double h, int fill, int border) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(border).size(2);
    if (fill >= 0) pen.rr(w, h, fill);
    pen.r(w, h);
}

void txt(double x, double y, const std::string &s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}

void txtL(double x, double y, const std::string &s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

void wipe(double x, double y, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

// 一个文字槽：内容（含颜色）没变就一个字都不动
struct TS { std::string last; int col; double left, y, w, h; int sz; };

void put(TS &t, const std::string &s, int c) {
    if (s == t.last && c == t.col) return;
    wipe(t.left + t.w / 2 - 2, t.y, t.w, t.h);
    txtL(t.left, t.y, s, c, t.sz);
    t.last = s; t.col = c;
}

const double CW = 76.0, GAP = 8.0, CY = 150.0;
double cellX(int i) { return -332.0 + CW / 2 + i * (CW + GAP); }

TS pPhase = {"", -1, -350, 262, 560, 28, 18};
TS pSize  = {"", -1, -350, 26, 280, 26, 16};
TS pGNote = {"", -1, -350, -98, 340, 20, 13};
TS pMsg   = {"", -1, -350, -126, 520, 26, 16};
TS pNote  = {"", -1, -350, -152, 440, 22, 13};
TS pSort  = {"", -1, -350, -186, 320, 24, 16};
TS pFind  = {"", -1, -350, -216, 320, 24, 16};
TS pSum   = {"", -1, -350, -246, 320, 24, 16};
TS pMM    = {"", -1, -350, -276, 320, 24, 16};

// ---- 局部重绘的脏跟踪状态 ----
int lastSig[16];                   // 格子：状态*16+值，-1 = 这一格不存在
int idxDone[16], mmDone[2];        // 下标 / min-max 标签只追加一次
int lastGV[16];                    // 旧内存块：-1 无 -2 灰空块 >=0 值
int lastGhostOn = 0, lastBCap = 0;

// 静态背景：标题、副标题、图例（都在动态槽位之外）
void drawStatic() {
    txtL(-350, 330, "STL 容器与算法", 0, 26);
    txtL(-350, 302, "vector<int> v{5,3,9,1,7,2,8}：push_back / sort / find / accumulate", 8, 14);
    txtL(-350, -340, "黄=正在处理  绿=完成/命中  橙=扩容搬移  灰=扫过未命中/旧块", 8, 13);
    for (int i = 0; i < 16; i++) { lastSig[i] = -1; lastGV[i] = -1; idxDone[i] = 0; }
    mmDone[0] = mmDone[1] = 0;
}

// 格子：格距 84，含 2px 边框的 footprint 是 78×78，擦 80×80 刚好盖住自己又不啃邻居；
// 下标在 y=94、min/max 在 y=204，都落在槽位（110..190）外面，所以只追加一次
void drawCells() {
    int n = (int)v.size(), cap = (int)v.capacity();
    if (cap > 16) cap = 16;
    for (int i = 0; i < 16; i++) {
        int sig = -1;
        if (i < cap) {
            int s = (i < n) ? st[i] : 5;
            sig = s * 16 + ((i < n) ? v[i] : 0);
        }
        if (sig != lastSig[i]) {
            double x = cellX(i);
            wipe(x, CY, 80, 80);
            if (sig >= 0) {
                int s = (i < n) ? st[i] : 5;
                if (s == 5) {
                    pen.setAngle(0);
                    pen.pu().moveTo(x, CY).pd().c(8).size(2).r(CW, CW);
                } else {
                    int fill = 15, bd = 2;
                    if (s == 1) { fill = 5; bd = 0; }
                    else if (s == 2) { fill = 3; bd = 10; }
                    else if (s == 3) { fill = 8; bd = 8; }
                    else if (s == 4) { fill = 14; bd = 6; }
                    cell(x, CY, CW, CW, fill, bd);
                    txt(x, CY, S(v[i]), 0, 28);
                }
            }
            lastSig[i] = sig;
        }
        if (i < cap && !idxDone[i]) { txt(cellX(i), CY - 56, S(i), 8, 13); idxDone[i] = 1; }
    }
    if (minIdx >= 0 && minIdx < n && !mmDone[0]) {
        txt(cellX(minIdx), CY + 54, "min", 10, 15); mmDone[0] = 1;
    }
    if (maxIdx >= 0 && maxIdx < n && !mmDone[1]) {
        txt(cellX(maxIdx), CY + 54, "max", 1, 15); mmDone[1] = 1;
    }
}

// capacity 紫线只会变长：横线与左端刻度原地盖画，只擦掉旧的右端刻度和旧文字
void drawCap() {
    int cap = (int)v.capacity();
    if (cap > 16) cap = 16;
    if (cap == lastBCap) return;
    double xl = cellX(0) - CW / 2;
    if (lastBCap > 0) {
        double oxr = cellX(lastBCap - 1) + CW / 2;
        wipe(oxr, 78, 10, 16);                 // 旧右端刻度（y 70..86，够不到 y=94 的下标）
        wipe((xl + oxr) / 2, 56, 110, 24);     // 旧 capacity 文字（左边界避开 x=-356 的橙色箭头）
    }
    if (cap > 0) {
        double xr = cellX(cap - 1) + CW / 2;
        pen.c(11);
        seg(xl, 74, xr, 74, 3);
        seg(xl, 74, xl, 82, 3);
        seg(xr, 74, xr, 82, 3);
        txt((xl + xr) / 2, 56, "capacity = " + S(cap), 11, 15);
    }
    lastBCap = cap;
}

// 扩容时的旧内存块 + 左侧橙色搬移箭头：箭头出现/消失才动画，擦除分成竖杆和箭头两块，
// 都避开 x=-350 起的 size 文字和 x=-333 起的格子
void drawGhost() {
    for (int i = 0; i < 16; i++) {
        int want = -1;
        if (i < ghostCap) want = (i < ghostN) ? ghostVal[i] : -2;
        if (want != lastGV[i]) {
            double x = cellX(i);
            wipe(x, -60, 60, 52);
            if (want != -1) {
                cell(x, -60, 56, 48, 8, 8);
                if (want >= 0) txt(x, -60, S(want), 15, 20);
            }
            lastGV[i] = want;
        }
    }
    put(pGNote, ghostCap > 0 ? "灰色 = 扩容前的旧内存块，元素搬到新块后就释放" : "", 8);
    int on = (ghostCap > 0) ? 1 : 0;
    if (on != lastGhostOn) {
        if (on) {
            pen.c(14);
            seg(-356, -50, -356, 130, 3);
            seg(-356, 130, -362, 118, 3);
            seg(-356, 130, -350, 118, 3);
        } else {
            wipe(-356, 39, 8, 186);
            wipe(-356, 124, 22, 22);
        }
        lastGhostOn = on;
    }
}

// 每帧：只重画变化的格子与文字，静态背景已经在画布上
void render() {
    put(pPhase, phase, 11);
    drawCells();
    drawCap();
    put(pSize, "size = " + S((int)v.size()) + "    capacity = " + S((int)v.capacity()), 0);
    drawGhost();
    put(pMsg, msg, 0);
    put(pNote, note, 8);
    put(pSort, rSort, 0);
    put(pFind, rFind, 0);
    put(pSum, rSum, 0);
    put(pMM, rMM, 0);
}

void saveSnap() {
    snapN = (int)v.size();
    for (int i = 0; i < snapN && i < 16; i++) snap[i] = v[i];
}

// 比较器拿到的可能是数组里的元素，也可能是算法内部的临时副本：
// 先按地址算下标，算不出来就按值找（数据里没有重复值）
int posOf(const int& x) {
    uintptr_t base = (uintptr_t)v.data(), a = (uintptr_t)&x;
    if (!v.empty() && a >= base && a < base + v.size() * sizeof(int))
        return (int)((a - base) / sizeof(int));
    for (int i = 0; i < (int)v.size(); i++) if (v[i] == x) return i;
    return -1;
}

// std::sort 的比较器：黄格=这次比较的两个元素，橙格=上一步比较后算法搬动的元素
bool cmp(const int& a, const int& b) {
    for (int i = 0; i < 16; i++) st[i] = 0;
    bool moved = false;
    for (int i = 0; i < (int)v.size() && i < snapN; i++)
        if (v[i] != snap[i]) { st[i] = 4; moved = true; }
    int ia = posOf(a), ib = posOf(b);
    if (ia >= 0) st[ia] = 1;
    if (ib >= 0) st[ib] = 1;
    msg = "比较 " + S(a) + " < " + S(b) + " → " + (a < b ? "true" : "false")
        + (moved ? "（橙格是上一步搬动的）" : "");
    render(); wait(0.06);
    saveSnap();
    return a < b;
}

// find 的谓词：每看一个元素就画一帧，命中标绿、没命中标灰
bool hit(int x) {
    bool ok = (x == target);
    st[scanPos] = 1;
    msg = "看 v[" + S(scanPos) + "] = " + S(x) + (ok ? "，命中，停下" : "，不是 " + S(target) + "，往右继续");
    render(); wait(0.1);
    st[scanPos] = ok ? 2 : 3;
    scanPos++;
    return ok;
}

// accumulate 的累加 op：黄格=正在加进来的元素，加完标绿
long long acc(long long s, int x) {
    st[accPos] = 1;
    long long ns = s + x;
    msg = "sum = " + S((int)s) + " + " + S(x) + " = " + S((int)ns);
    rSum = "sum    : " + S((int)ns);
    render(); wait(0.08);
    st[accPos] = 2;
    accPos++;
    return ns;
}

int main() {
    pen.speed(10);
    for (int i = 0; i < 16; i++) st[i] = 0;
    drawStatic();
    int data[7] = {5, 3, 9, 1, 7, 2, 8};

    // ① push_back：size 追上 capacity 就翻倍扩容，旧块元素搬到新块
    phase = "① push_back：size 追上 capacity 就翻倍扩容";
    note = "紫线=capacity 范围，灰空槽=capacity 里还没用到的位置";
    render(); wait(0.35);
    for (int i = 0; i < 7; i++) {
        int oldCap = (int)v.capacity();
        if ((int)v.size() == oldCap) {
            ghostCap = oldCap; ghostN = (int)v.size();
            for (int k = 0; k < ghostN; k++) ghostVal[k] = v[k];
            msg = "size == capacity == " + S(oldCap) + "，放不下新元素，先扩容";
            render(); wait(0.13);
        }
        v.push_back(data[i]);
        for (int k = 0; k < 16; k++) st[k] = 0;
        int n = (int)v.size();
        st[n - 1] = 1;
        int newCap = (int)v.capacity();
        if (newCap != oldCap) {
            for (int k = 0; k < n - 1; k++) st[k] = 4;
            msg = "capacity " + S(oldCap) + " → " + S(newCap) + "：搬移 " + S(ghostN) + " 个元素，再 push_back(" + S(data[i]) + ")";
        } else {
            ghostCap = 0;
            msg = "push_back(" + S(data[i]) + ")：容量够，直接放进下标 " + S(n - 1);
        }
        render(); wait(0.13);
        ghostCap = 0;
    }

    // ② std::sort：比较器里画出每一次比较，被搬动的格子标橙
    phase = "② std::sort：黄格=正在比较的两个元素";
    note = "橙格=上一次比较之后算法内部搬动的元素";
    for (int k = 0; k < 16; k++) st[k] = 0;
    saveSnap();
    msg = "调用 std::sort(v.begin(), v.end())，比较器把每一步画出来";
    render(); wait(0.3);
    std::sort(v.begin(), v.end(), cmp);
    for (int k = 0; k < (int)v.size(); k++) st[k] = 2;
    rSort = "sort   : ";
    for (int i = 0; i < (int)v.size(); i++) rSort += S(v[i]) + " ";
    msg = "排序完成，全部标绿";
    render(); wait(0.35);

    // ③ find：从头逐个扫描，命中就停
    phase = "③ std::find：从头逐个扫描，命中就停";
    note = "灰格=扫过但不等于目标值，绿格=命中";
    for (int k = 0; k < 16; k++) st[k] = 0;
    scanPos = 0;
    msg = "find(v.begin(), v.end(), " + S(target) + ")：线性扫描，用谓词画出每一步";
    render(); wait(0.25);
    std::vector<int>::iterator it = std::find_if(v.begin(), v.end(), hit);
    int fi = (it == v.end()) ? -1 : (int)(it - v.begin());
    rFind = "find   : 找 " + S(target) + " → " + (fi >= 0 ? "下标 " + S(fi) : std::string("没找到"));
    msg = (fi >= 0) ? ("命中 v[" + S(fi) + "]，扫描停止") : "扫完了，没找到";
    render(); wait(0.35);

    // ④ accumulate 求和 + minmax_element 找最值
    phase = "④ accumulate 求和 + minmax_element 找最值";
    note = "绿格=已累加 / 最小值与最大值";
    for (int k = 0; k < 16; k++) st[k] = 0;
    accPos = 0;
    msg = "accumulate(v.begin(), v.end(), 0LL)：逐个累加";
    render(); wait(0.25);
    long long sum = std::accumulate(v.begin(), v.end(), 0LL, acc);
    auto mm = std::minmax_element(v.begin(), v.end());
    minIdx = (int)(mm.first - v.begin());
    maxIdx = (int)(mm.second - v.begin());
    st[minIdx] = 2; st[maxIdx] = 2;
    rSum = "sum    : " + S((int)sum);
    rMM = "min,max: " + S(*mm.first) + ", " + S(*mm.second) + "    size = " + S((int)v.size());
    msg = "minmax_element：最小 " + S(*mm.first) + "，最大 " + S(*mm.second);
    render(); wait(0.8);

    printf("sorted:");
    for (int i = 0; i < (int)v.size(); i++) printf(" %d", v[i]);
    printf(" | sum=%lld | min,max=%d,%d | find(%d)=%d | size=%d cap=%d\\n",
           sum, *mm.first, *mm.second, target, fi, (int)v.size(), (int)v.capacity());
    return 0;
}
`,
  },
  'string / map / sstream（画图版）': {
    group: 'GoC 可视化·基础与STL',
    stdin: '',
    code: `// string / map / sstream（局部重绘）：三栏依次演示，当前那一栏的边框加粗变紫。
// 左栏 string：字符格子演示 a + b 拼接，再演示 find 的滑动窗口逐位比较；
// 中栏 map：把 std::map 内部的红黑树画出来（新节点先染红，再按红黑规则变色/旋转），
//           树下面按中序列出键值对；右栏 sstream：iss >> word 逐词提取，取出的词标绿。
// 颜色约定：黄=正在处理，绿=完成/命中，橙=红黑树这次变色或旋转涉及的节点，红/黑=树节点本色。
// 算法与原版一致：getline 取行 → istringstream 拆词 → ++freq[word]（map<string,int>）。
// 原版从 cin 读行，这里把同样格式的三行文本内置成字符串，方便无人值守演示；
// 统计仍用真正的 std::map，画出来的红黑树按同样规则插入，最后核对两者完全一致。
// 绘制：标题 / 副标题 / 图例 / a、b 字符格 / 固定标签只画一次；栏边框只在 act 切换时擦走廊重画；
//       s 格子和右栏词格是「不透明同几何」元素，状态变了原位盖画；find 高亮框、红黑树节点与边、
//       各栏文字各自脏跟踪，先 setAngle(0) + clsRec 擦旧槽再画，擦到谁就补画谁，不整屏 cls。
#include <goc.h>
#include <cstdio>
#include <string>
#include <map>
#include <sstream>

const char* TEXT = "the quick brown fox\\nthe lazy dog\\nthe fox jumps";

std::map<std::string, int> freq;      // 原版用的容器，权威数据
std::string lines[8]; int nline = 0;  // 每一行原文
std::string lw[8][8]; int lwn[8];     // 每一行拆出来的词
struct Ev { std::string w; int ln; int wi; bool fresh; };
Ev ev[64]; int ne = 0;                // 拆词事件回放表

// 红黑树（std::map 内部就是它）：l/r/p 是下标，-1 表示空
struct Nd { std::string k; int v; int l, r, p; bool red; };
Nd nd[24]; int nn = 0, root = -1;
int chg[24];                          // 橙圈：这次变色/旋转涉及的节点
int order[24], no = 0, dep[24];       // 中序序列与深度，用来排版
int hot = -1;                         // 黄圈：正在插入/更新的节点
std::string fixLog = "";

std::string A = "the ", B = "fox", str = "";
int sShown = 0, findPos = -1, findRes = -1;
bool findHit = false;
std::string sMsg = "", sRes = "";
std::string mCur = "", mMsg = "";
int curLine = -1, curWord = -1, taken = 0, act = 0;
int wst[8][8];                        // 0 未提取 1 正在提取(黄) 2 已提取(绿)
std::string tCur = "", tMsg = "", phase = "";

std::string S(int x) { char b[32]; snprintf(b, sizeof b, "%d", x); return std::string(b); }

void seg(double x1, double y1, double x2, double y2, double wd) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return;
    pen.pu().moveTo(x1, y1).pd().size(wd).setAngle(atan2_deg(dx, dy)).fd(L);
}

// 不 cls 了，角度得自己归零：rr / r / oo / clsRec 都跟着笔朝向转
void cell(double x, double y, double w, double h, int fill, int border) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(border).size(2);
    if (fill >= 0) pen.rr(w, h, fill);
    pen.r(w, h);
}

void drawChar(double x, double y, char ch, int sz) {
    pen.setAngle(0);
    if (ch == ' ') { pen.pu().moveTo(x, y).pd().c(8).size(2).oo(2, 8); return; }
    std::string t(1, ch);
    pen.pu().moveTo(x, y).pd().c(0).text(t, 0, sz);
}

void txt(double x, double y, const std::string &s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).text(s, col, size);
}

void txtL(double x, double y, const std::string &s, int col, int size) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(col).textL(s, col, size);
}

void rawWipe(double x, double y, double w, double h) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().clsRec(w, h);
}

// ---- 三栏边框：边框在所有内容下层，擦除框压到它就得把它补回来 ----
double BCX[3] = {-270, 0, 270}, BCW[3] = {206, 330, 206};
const char* HD[3] = {"① string", "② map", "③ sstream"};

void bEdge(int i, int side) {
    bool on = (act == i + 1);
    double w = on ? 3 : 1;
    double L = BCX[i] - BCW[i] / 2, R = BCX[i] + BCW[i] / 2;
    pen.c(on ? 11 : 8);
    if (side == 0) seg(L, -280, L, 290, w);
    else if (side == 1) seg(R, -280, R, 290, w);
    else if (side == 2) seg(L, 290, R, 290, w);
    else seg(L, -280, R, -280, w);
}

void fixBorders(double x1, double y1, double x2, double y2) {
    for (int i = 0; i < 3; i++) {
        double L = BCX[i] - BCW[i] / 2, R = BCX[i] + BCW[i] / 2;
        if (y1 <= 290 && y2 >= -280) {
            if (x1 <= L + 2 && x2 >= L - 2) bEdge(i, 0);
            if (x1 <= R + 2 && x2 >= R - 2) bEdge(i, 1);
        }
        if (x1 <= R && x2 >= L) {
            if (y1 <= 292 && y2 >= 288) bEdge(i, 2);
            if (y1 <= -278 && y2 >= -282) bEdge(i, 3);
        }
    }
}

void wipe(double x, double y, double w, double h) {
    rawWipe(x, y, w, h);
    fixBorders(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
}

// ---- 局部重绘基础设施：擦掉的矩形登记下来，谁被擦到谁补画 ----
const int MAXR = 600;
double erX[MAXR], erY[MAXR], erW[MAXR], erH[MAXR];
int erN = 0;

void eraseBox(double cx, double cy, double w, double h) {
    rawWipe(cx, cy, w, h);
    fixBorders(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    if (erN < MAXR) { erX[erN] = cx; erY[erN] = cy; erW[erN] = w; erH[erN] = h; erN++; }
}

// 擦一条边：沿线走一串小方块，只擦这条边自己的走廊
void eraseSeg(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1, dy = y2 - y1;
    double L = sqrt(dx * dx + dy * dy);
    int steps = (int)(L / 7.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        eraseBox(x1 + dx * t, y1 + dy * t, 16, 16);
    }
}

int rectHitEr(double cx, double cy, double w, double h) {
    for (int k = 0; k < erN; k++)
        if (fabs(cx - erX[k]) * 2 <= w + erW[k] && fabs(cy - erY[k]) * 2 <= h + erH[k]) return 1;
    return 0;
}

int segHitEr(double x1, double y1, double x2, double y2, double m) {
    double dx = x2 - x1, dy = y2 - y1;
    int steps = (int)(sqrt(dx * dx + dy * dy) / 6.0) + 1;
    for (int k = 0; k <= steps; k++) {
        double t = (double)k / steps;
        double x = x1 + dx * t, y = y1 + dy * t;
        for (int j = 0; j < erN; j++)
            if (fabs(x - erX[j]) <= erW[j] / 2 + m && fabs(y - erY[j]) <= erH[j] / 2 + m) return 1;
    }
    return 0;
}

// 一个文字槽：内容（含颜色）没变就一个字都不动
struct TS { std::string last; int col; double left, y, w, h; int sz; };

void put(TS &t, const std::string &s, int c) {
    if (s == t.last && c == t.col) return;
    wipe(t.left + t.w / 2 - 2, t.y, t.w, t.h);
    txtL(t.left, t.y, s, c, t.sz);
    t.last = s; t.col = c;
}

void putC(TS &t, const std::string &s, int c) {   // left 存的是中心 x
    if (s == t.last && c == t.col) return;
    wipe(t.left, t.y, t.w, t.h);
    txt(t.left, t.y, s, c, t.sz);
    t.last = s; t.col = c;
}

TS pPhase = {"", -1, -350, -302, 520, 26, 16};
TS pSM    = {"", -1, -360, -24, 250, 20, 12};
TS pSR    = {"", -1, -360, -84, 180, 24, 16};
TS pSS    = {"", -1, -360, -116, 150, 20, 13};
TS pSub   = {"", -1, -360, -148, 170, 20, 13};
TS pMC    = {"", -1, -150, -20, 210, 24, 15};
TS pMM    = {"", -1, -150, -46, 210, 20, 12};
TS pSize  = {"", -1, -150, -272, 150, 22, 14};
TS pTM    = {"", -1, 170, -92, 180, 20, 12};
TS pTk    = {"", -1, 170, -120, 180, 20, 14};
TS pLine[3] = {{"", -1, 270, 208, 180, 20, 12},
               {"", -1, 270, 120, 180, 20, 12},
               {"", -1, 270, 32, 180, 20, 12}};
TS pRow[7];

void rotL(int x) {
    int y = nd[x].r;
    nd[x].r = nd[y].l;
    if (nd[y].l != -1) nd[nd[y].l].p = x;
    nd[y].p = nd[x].p;
    if (nd[x].p == -1) root = y;
    else if (x == nd[nd[x].p].l) nd[nd[x].p].l = y;
    else nd[nd[x].p].r = y;
    nd[y].l = x; nd[x].p = y;
    chg[x] = chg[y] = 1;
}

void rotR(int x) {
    int y = nd[x].l;
    nd[x].l = nd[y].r;
    if (nd[y].r != -1) nd[nd[y].r].p = x;
    nd[y].p = nd[x].p;
    if (nd[x].p == -1) root = y;
    else if (x == nd[nd[x].p].r) nd[nd[x].p].r = y;
    else nd[nd[x].p].l = y;
    nd[y].r = x; nd[x].p = y;
    chg[x] = chg[y] = 1;
}

// 红黑树插入修复：叔红就变色上推，否则旋转 + 变色
void fixup(int z) {
    fixLog = "";
    while (nd[z].p != -1 && nd[nd[z].p].red) {
        int p = nd[z].p, g = nd[p].p;
        if (g == -1) break;
        if (p == nd[g].l) {
            int u = nd[g].r;
            if (u != -1 && nd[u].red) {
                nd[p].red = false; nd[u].red = false; nd[g].red = true;
                chg[p] = chg[u] = chg[g] = 1;
                fixLog += "叔红：父叔变黑、祖变红 ";
                z = g;
            } else {
                if (z == nd[p].r) { z = p; rotL(z); fixLog += "左旋 "; p = nd[z].p; g = nd[p].p; }
                nd[p].red = false; nd[g].red = true; rotR(g);
                chg[p] = chg[g] = 1;
                fixLog += "父黑祖红 + 右旋 ";
            }
        } else {
            int u = nd[g].l;
            if (u != -1 && nd[u].red) {
                nd[p].red = false; nd[u].red = false; nd[g].red = true;
                chg[p] = chg[u] = chg[g] = 1;
                fixLog += "叔红：父叔变黑、祖变红 ";
                z = g;
            } else {
                if (z == nd[p].l) { z = p; rotR(z); fixLog += "右旋 "; p = nd[z].p; g = nd[p].p; }
                nd[p].red = false; nd[g].red = true; rotL(g);
                chg[p] = chg[g] = 1;
                fixLog += "父黑祖红 + 左旋 ";
            }
        }
    }
    if (root != -1 && nd[root].red) { nd[root].red = false; chg[root] = 1; fixLog += "根染黑 "; }
}

// 键已存在就只把值加 1（对应 ++freq[word]），否则插新节点并修复
int treeAdd(const std::string& k) {
    int cur = root, par = -1;
    while (cur != -1) {
        par = cur;
        if (k < nd[cur].k) cur = nd[cur].l;
        else if (k > nd[cur].k) cur = nd[cur].r;
        else { nd[cur].v++; return cur; }
    }
    int z = nn++;
    nd[z].k = k; nd[z].v = 1; nd[z].l = -1; nd[z].r = -1; nd[z].p = par; nd[z].red = true;
    if (par == -1) root = z;
    else if (k < nd[par].k) nd[par].l = z;
    else nd[par].r = z;
    chg[z] = 1;
    fixup(z);
    return z;
}

int findNode(const std::string& k) {
    int cur = root;
    while (cur != -1) {
        if (k == nd[cur].k) return cur;
        cur = (k < nd[cur].k) ? nd[cur].l : nd[cur].r;
    }
    return -1;
}

void inorder(int u) { if (u < 0) return; inorder(nd[u].l); order[no++] = u; inorder(nd[u].r); }
void depths(int u, int d) { if (u < 0) return; dep[u] = d; depths(nd[u].l, d + 1); depths(nd[u].r, d + 1); }
double tx(int slot) { return -(no - 1) * 22.0 + slot * 44.0; }
double ty(int d) { return 200.0 - d * 56.0; }

// ---- 红黑树的脏跟踪：节点槽 56×64（圈 + 上方键名），边按「父下标*2+左右」记 ----
int lNOn[24], lNFill[24], lNChg[24], lNHot[24], lNVal[24];
double lNX[24], lNY[24];
std::string lNKey[24];
int lEOn[48];
double lEX1[48], lEY1[48], lEX2[48], lEY2[48];
int dn[24], pn[24], de[48], pe[48];

double nRad(int c, int h) { return h ? 26.0 : (c ? 22.5 : 18.0); }

void paintNode(double x, double y, int fill, int c, int h, int val, const std::string &k) {
    pen.setAngle(0);
    pen.pu().moveTo(x, y).pd().c(fill).size(2).oo(17, fill);
    if (c) { pen.setAngle(0); pen.pu().moveTo(x, y).pd().c(14).size(3).o(21); }
    if (h) { pen.setAngle(0); pen.pu().moveTo(x, y).pd().c(5).size(4).o(24); }
    txt(x, y, S(val), fill ? 0 : 15, 15);
    txt(x, y - 30, k, 0, 12);
}

void drawTree() {
    no = 0; inorder(root); depths(root, 0);
    int slot[24];
    for (int i = 0; i < no; i++) slot[order[i]] = i;
    double nx[24], ny[24];
    int non[24], nf[24], nc[24], nh[24], nv[24];
    for (int i = 0; i < 24; i++) {
        dn[i] = 0; pn[i] = 0;
        non[i] = (i < nn) ? 1 : 0;
        nx[i] = 0; ny[i] = 0; nf[i] = 0; nc[i] = 0; nh[i] = 0; nv[i] = 0;
        if (non[i]) {
            nx[i] = tx(slot[i]); ny[i] = ty(dep[i]);
            nf[i] = nd[i].red ? 1 : 0; nc[i] = chg[i] ? 1 : 0;
            nh[i] = (i == hot) ? 1 : 0; nv[i] = nd[i].v;
        }
    }
    int eon[48];
    double ex1[48], ey1[48], ex2[48], ey2[48];
    for (int e = 0; e < 48; e++) {
        de[e] = 0; pe[e] = 0; eon[e] = 0;
        ex1[e] = 0; ey1[e] = 0; ex2[e] = 0; ey2[e] = 0;
    }
    for (int i = 0; i < nn; i++) {
        for (int s = 0; s < 2; s++) {
            int ch = s ? nd[i].r : nd[i].l;
            int e = i * 2 + s;
            if (ch >= 0) { eon[e] = 1; ex1[e] = nx[i]; ey1[e] = ny[i]; ex2[e] = nx[ch]; ey2[e] = ny[ch]; }
        }
    }
    // 1) 只挑状态变了（含位置变了）的节点与边
    for (int i = 0; i < 24; i++) {
        if (non[i] != lNOn[i]) dn[i] = 1;
        else if (non[i] && (nx[i] != lNX[i] || ny[i] != lNY[i] || nf[i] != lNFill[i]
                 || nc[i] != lNChg[i] || nh[i] != lNHot[i] || nv[i] != lNVal[i]
                 || nd[i].k != lNKey[i])) dn[i] = 1;
    }
    for (int e = 0; e < 48; e++) {
        if (eon[e] != lEOn[e]) de[e] = 1;
        else if (eon[e] && (ex1[e] != lEX1[e] || ey1[e] != lEY1[e]
                 || ex2[e] != lEX2[e] || ey2[e] != lEY2[e])) de[e] = 1;
    }
    // 2) 擦旧槽
    erN = 0;
    for (int i = 0; i < 24; i++) if (dn[i] && lNOn[i]) eraseBox(lNX[i], lNY[i] - 5, 56, 64);
    for (int e = 0; e < 48; e++) if (de[e] && lEOn[e]) eraseSeg(lEX1[e], lEY1[e], lEX2[e], lEY2[e]);
    // 3) 被擦到的边 / 节点补画
    for (int e = 0; e < 48; e++)
        if (!de[e] && eon[e] && segHitEr(ex1[e], ey1[e], ex2[e], ey2[e], 3)) pe[e] = 1;
    for (int i = 0; i < nn; i++)
        if (!dn[i] && rectHitEr(nx[i], ny[i] - 5, 56, 64)) pn[i] = 1;
    // 4) 边在节点下层：补画的边要把两端节点一起补上
    for (int e = 0; e < 48; e++) if (de[e] || pe[e]) {
        int i = e / 2, ch = (e % 2) ? nd[i].r : nd[i].l;
        if (i < nn) pn[i] = 1;
        if (ch >= 0) pn[ch] = 1;
    }
    // 5) 节点按下标升序画（和原版一致）：后画的盖先画的，被盖到的也要补
    for (int i = 0; i < nn; i++) {
        if (!pn[i] && !dn[i]) continue;
        double ri = nRad(nc[i], nh[i]);
        double wi = ri, ki = 3.0 * (double)nd[i].k.size() + 2;
        if (ki > wi) wi = ki;
        for (int j = i + 1; j < nn; j++) {
            if (pn[j] || dn[j]) continue;
            double rj = nRad(nc[j], nh[j]);
            double wj = rj, kj = 3.0 * (double)nd[j].k.size() + 2;
            if (kj > wj) wj = kj;
            if (fabs(nx[i] - nx[j]) >= wi + wj) continue;
            if (ny[i] - 36 < ny[j] + rj && ny[j] - 36 < ny[i] + ri) pn[j] = 1;
        }
    }
    // 6) 先边后节点
    for (int e = 0; e < 48; e++) if ((de[e] || pe[e]) && eon[e]) {
        pen.c(8);
        seg(ex1[e], ey1[e], ex2[e], ey2[e], 2);
    }
    for (int i = 0; i < nn; i++) if (dn[i] || pn[i])
        paintNode(nx[i], ny[i], nf[i], nc[i], nh[i], nv[i], nd[i].k);
    // 7) 记下这一帧
    for (int i = 0; i < 24; i++) {
        lNOn[i] = non[i]; lNX[i] = nx[i]; lNY[i] = ny[i]; lNFill[i] = nf[i];
        lNChg[i] = nc[i]; lNHot[i] = nh[i]; lNVal[i] = nv[i];
        lNKey[i] = non[i] ? nd[i].k : "";
    }
    for (int e = 0; e < 48; e++) {
        lEOn[e] = eon[e]; lEX1[e] = ex1[e]; lEY1[e] = ey1[e]; lEX2[e] = ex2[e]; lEY2[e] = ey2[e];
    }
}

// ---- 左栏：s 的 7 个格子 ----
// 三种状态（灰空框 / 黄底 / 白底）几何一样，新格子 footprint 盖得住旧的，所以原位盖画不用擦；
// 只有会移动的 find 高亮框要先擦旧槽，擦到谁就把谁补画一遍
int lSS[7], lHl = -2;
bool hlNeed = false;

double sX(int i) { return -270 + (i - 3) * 27; }

int sState(int i) {
    if (i >= sShown) return 0;
    return (i == sShown - 1 && sShown < (int)str.size()) ? 1 : 2;
}

void paintSCell(int i) {
    double x = sX(i);
    int stt = sState(i);
    if (stt == 0) {
        pen.setAngle(0);
        pen.pu().moveTo(x, 44).pd().c(8).size(1).r(26, 32);
    } else {
        cell(x, 44, 26, 32, stt == 1 ? 5 : 15, stt == 1 ? 0 : 2);
        drawChar(x, 44, str[i], 16);
    }
}

void drawSRow() {
    int rp[7];
    for (int i = 0; i < 7; i++) rp[i] = 0;
    int hlSig = (findPos < 0) ? -1 : findPos * 2 + (findHit ? 1 : 0);
    if (hlSig != lHl) {
        int oldPos = (lHl < 0) ? -1 : lHl / 2;
        if (oldPos >= 0) {
            double ox = sX(oldPos + 1);
            wipe(ox, 44, 84, 44);
            for (int i = 0; i < 7; i++) if (fabs(sX(i) - ox) <= 56) rp[i] = 1;
        }
        hlNeed = true;
        lHl = hlSig;
    }
    for (int i = 0; i < 7; i++) {
        int stt = sState(i);
        if (stt != lSS[i]) { rp[i] = 1; lSS[i] = stt; }
    }
    double hx = (findPos >= 0) ? sX(findPos + 1) : 0;
    for (int i = 0; i < 7; i++) if (rp[i]) {
        paintSCell(i);
        if (findPos >= 0 && fabs(sX(i) - hx) <= 56) hlNeed = true;
    }
    if (findPos >= 0 && hlNeed) {
        pen.setAngle(0);
        pen.pu().moveTo(hx, 44).pd().c(findHit ? 3 : 5).size(3).r(80, 40);
    }
    hlNeed = false;
}

// ---- 右栏：词格也是不透明同几何，状态变了原位盖画 ----
int lWst[8][8];
std::string lTC = "";

void drawRight() {
    for (int L = 0; L < nline; L++) {
        double ytop = 208 - L * 88;
        putC(pLine[L], "'" + lines[L] + "'", L == curLine ? 0 : 8);
        for (int j = 0; j < lwn[L]; j++) {
            int s = wst[L][j];
            if (s == lWst[L][j]) continue;
            double x = 270 + (j - (lwn[L] - 1) / 2.0) * 46, y = ytop - 30;
            if (s == 0) {
                pen.setAngle(0);
                pen.pu().moveTo(x, y).pd().c(8).size(1).r(44, 26);
                txt(x, y, "?", 8, 13);
            } else {
                cell(x, y, 44, 26, s == 1 ? 5 : 3, s == 1 ? 0 : 10);
                txt(x, y, lw[L][j], 0, 12);
            }
            lWst[L][j] = s;
        }
    }
    if (tCur != "" && tCur != lTC) {
        cell(270, -52, 150, 36, 3, 10);
        txt(270, -52, "word = '" + tCur + "'", 0, 15);
        lTC = tCur;
    }
    put(pTM, tMsg, 0);
    put(pTk, "已提取 " + S(taken) + " / " + S(ne) + " 个词", 0);
}

// 切换当前栏：只擦三条边框自己的走廊 + 栏标题槽，再按新的 act 重画边框，
// 被走廊擦到的动态文字（压在边框上面那几行）强制重画一次
void drawBorders() {
    for (int i = 0; i < 3; i++) {
        double L = BCX[i] - BCW[i] / 2, R = BCX[i] + BCW[i] / 2;
        rawWipe(BCX[i], 290, BCW[i] + 8, 6);
        rawWipe(BCX[i], -280, BCW[i] + 8, 6);
        rawWipe(L, 5, 8, 578);
        rawWipe(R, 5, 8, 578);
        rawWipe(BCX[i], 268, BCW[i] - 8, 28);
    }
    for (int i = 0; i < 3; i++) {
        bool on = (act == i + 1);
        pen.setAngle(0);
        pen.pu().moveTo(BCX[i], 5).pd().c(on ? 11 : 8).size(on ? 3 : 1).r(BCW[i], 570);
        txt(BCX[i], 268, HD[i], on ? 11 : 8, 18);
    }
    pSM.last = "\\1"; pSize.last = "\\1"; pTM.last = "\\1"; pTk.last = "\\1";
}

// 静态背景：标题、副标题、图例、a/b 字符格、各栏固定标签（都在动态槽位之外）
void drawStatic() {
    txtL(-350, 330, "string / map / sstream", 0, 26);
    txtL(-350, 302, "getline 取行 → istringstream >> word → ++freq[word]（map<string,int>）", 8, 13);
    txtL(-350, -340, "黄=正在处理  绿=完成/命中  橙=变色或旋转  红/黑=树节点本色", 8, 13);
    txt(-270, 236, "拼接：s = a + b", 0, 14);
    txtL(-360, 206, "a = 'the '（空格画成小灰点）", 8, 12);
    for (int i = 0; i < (int)A.size(); i++) {
        double x = -270 + (i - 1.5) * 32;
        cell(x, 176, 30, 32, 15, 2);
        drawChar(x, 176, A[i], 16);
    }
    txtL(-360, 140, "b = 'fox'", 8, 12);
    for (int i = 0; i < (int)B.size(); i++) {
        double x = -270 + (i - 1) * 32;
        cell(x, 110, 30, 32, 15, 2);
        drawChar(x, 110, B[i], 16);
    }
    txtL(-360, 74, "s = a + b", 8, 12);
    txtL(-360, 4, "查找：s.find('fox')", 8, 12);
    txt(0, 240, "红黑树：键有序，插入 O(log n)", 0, 13);
    txtL(-150, -74, "map 内容（中序 = 按键有序）", 8, 13);
    txt(270, 236, "istringstream iss(line)", 0, 13);
    txtL(170, -148, "取出的词交给中栏 map 计数", 8, 12);
    for (int i = 0; i < 7; i++) {
        pRow[i] = TS{"", -1, -150.0, -98.0 - i * 24.0, 150.0, 22.0, 14};
        lSS[i] = -1;
    }
    for (int L = 0; L < 8; L++) for (int j = 0; j < 8; j++) lWst[L][j] = -1;
}

int lastAct = -1;

void render() {
    if (act != lastAct) { drawBorders(); lastAct = act; }
    // 左栏
    drawSRow();
    put(pSM, sMsg, 0);
    put(pSR, sRes, 3);
    put(pSS, "s.size() = " + S((int)str.size()), 0);
    if (findRes >= 0) put(pSub, "substr(" + S(findRes) + ",3) = 'fox'", 3);
    // 中栏
    drawTree();
    put(pMC, mCur, 0);
    put(pMM, mMsg, 14);
    for (int i = 0; i < 7; i++) {
        std::string s = "";
        int col = 0;
        if (i < no) { int u = order[i]; s = nd[u].k + " -> " + S(nd[u].v); col = (u == hot) ? 5 : 0; }
        put(pRow[i], s, col);
    }
    put(pSize, "size = " + S((int)freq.size()), 0);
    // 右栏
    drawRight();
    put(pPhase, phase, 11);
}

int main() {
    pen.speed(10);
    // 先按原版算法跑一遍：getline 取行 → istringstream 拆词 → ++freq[word]，同时记下过程
    std::istringstream all(TEXT);
    std::string line, word;
    while (std::getline(all, line)) {
        lines[nline] = line;
        std::istringstream iss(line);
        int wi = 0;
        while (iss >> word) {
            bool fresh = (freq.find(word) == freq.end());
            ++freq[word];
            lw[nline][wi] = word;
            ev[ne].w = word; ev[ne].ln = nline; ev[ne].wi = wi; ev[ne].fresh = fresh;
            ne++; wi++;
        }
        lwn[nline] = wi;
        nline++;
    }
    drawStatic();

    // ① 左栏 string：拼接 + 查找
    act = 1;
    phase = "① string：a + b 拼接，再用 find 逐位查找";
    sMsg = "把 b 的字符接到 a 后面，黄格=刚接上的字符";
    str = A + B;
    render(); wait(0.35);
    for (int k = 1; k <= (int)str.size(); k++) {
        sShown = k;
        sMsg = (k <= (int)A.size()) ? ("取 a[" + S(k - 1) + "] = '" + std::string(1, A[k - 1]) + "'")
                                    : ("取 b[" + S(k - 1 - (int)A.size()) + "] = '" + std::string(1, B[k - 1 - (int)A.size()]) + "'");
        render(); wait(0.06);
    }
    sMsg = "拼接完成，s = 'the fox'";
    render(); wait(0.3);
    findRes = (int)str.find(B);
    for (int p = 0; p + (int)B.size() <= (int)str.size(); p++) {
        findPos = p;
        bool ok = (str.compare(p, B.size(), B) == 0);
        sMsg = "pos=" + S(p) + ": '" + str.substr(p, B.size()) + "' " + (ok ? "==" : "!=") + " 'fox'";
        render(); wait(0.11);
        if (ok) {
            findHit = true;
            sRes = "find('fox') = " + S(findRes);
            render(); wait(0.35);
            break;
        }
    }

    // ② 中栏 map：把拆词事件回放成红黑树的插入 / 计数
    act = 2;
    phase = "② map<string,int>：红黑树插入键值对";
    mMsg = "新节点先染红，再按红黑规则变色 / 旋转";
    render(); wait(0.35);
    for (int i = 0; i < ne; i++) {
        for (int k = 0; k < 24; k++) chg[k] = 0;
        hot = -1;
        int u = treeAdd(ev[i].w);
        hot = u;
        mCur = ev[i].fresh ? ("插入 '" + ev[i].w + "' → 1")
                           : ("++freq['" + ev[i].w + "'] → " + S(nd[u].v));
        mMsg = ev[i].fresh ? (fixLog.empty() ? "父节点是黑的，不用调整" : fixLog)
                           : "键已存在，只把值加 1";
        render(); wait(0.13);
    }
    hot = -1;
    for (int k = 0; k < 24; k++) chg[k] = 0;
    mCur = "map.size() = " + S((int)freq.size());
    mMsg = "中序遍历就是按键有序的键值对";
    render(); wait(0.45);

    // ③ 右栏 sstream：逐词提取，取出的词标绿，同时点亮中栏对应的树节点
    act = 3;
    phase = "③ sstream：iss >> word 逐词提取";
    tMsg = "getline 取一行，再一个个取词";
    render(); wait(0.3);
    for (int L = 0; L < nline; L++) {
        curLine = L; curWord = -1;
        tMsg = "第 " + S(L + 1) + " 行 / 共 " + S(nline) + " 行";
        render(); wait(0.15);
        for (int j = 0; j < lwn[L]; j++) {
            curWord = j;
            wst[L][j] = 1;
            tCur = lw[L][j];
            hot = findNode(tCur);
            tMsg = "iss >> word：第 " + S(j + 1) + " 个词";
            render(); wait(0.1);
            wst[L][j] = 2;
            taken++;
            hot = -1;
        }
    }
    curWord = -1;
    tMsg = "提取完 " + S(taken) + " 个词，" + S((int)freq.size()) + " 个不同的键";
    render(); wait(0.6);

    // 核对：画出来的红黑树中序遍历应当和真正的 std::map 一模一样
    no = 0; inorder(root);
    bool same = (no == (int)freq.size());
    std::map<std::string, int>::iterator mit = freq.begin();
    for (int i = 0; i < no && mit != freq.end(); i++, ++mit)
        if (nd[order[i]].k != mit->first || nd[order[i]].v != mit->second) same = false;
    printf("词频:");
    for (mit = freq.begin(); mit != freq.end(); ++mit)
        printf(" %s->%d", mit->first.c_str(), mit->second);
    printf(" | 共%d词/%d键 | find('fox')=%d | 树与map%s\\n",
           taken, (int)freq.size(), findRes, same ? "一致" : "不一致");
    return 0;
}
`,
  },
};
