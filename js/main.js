/* main.js — 页面编排：常驻编译 Worker + 一次性运行 Worker */
'use strict';

/* Worker 里 fetch 是相对 worker 脚本解析的，所以必须给绝对 URL */
const BASE = new URL('assets/', location.href).href;
const ASSETS = { clang: 'clang.wasm', lld: 'lld.wasm', memfs: 'memfs.wasm', sysroot: 'sysroot.tar' };

const $ = (id) => document.getElementById(id);
const stdinEl = $('stdin'), outEl = $('out');
const dotEl = $('dot'), msgEl = $('msg');
const runBtn = $('run'), stopBtn = $('stop'), clearBtn = $('clear'), reloadBtn = $('reload');
const debugBtn = $('debug'), dbgBar = $('dbgbar'), dbgState = $('dbgstate'), dbgSpeed = $('dbspeed');

/* ---------- Ace 编辑器（模块全部本地化，保持离线可用） ---------- */
const ACE_BASE = new URL('vendor/ace/', location.href).href;
ace.config.setModuleUrl('ace/mode/c_cpp', ACE_BASE + 'mode-c_cpp.js');
ace.config.setModuleUrl('ace/theme/one_dark', ACE_BASE + 'theme-one_dark.js');
ace.config.setModuleUrl('ace/theme/tomorrow', ACE_BASE + 'theme-tomorrow.js');
ace.config.setModuleUrl('ace/snippets/c_cpp', ACE_BASE + 'snippets/c_cpp.js');
ace.config.setModuleUrl('ace/ext/language_tools', ACE_BASE + 'ext-language_tools.js');

const srcEditor = ace.edit('editor', {
  mode: 'ace/mode/c_cpp',
  theme: 'ace/theme/one_dark',
  fontSize: '14px',          /* 真正的值由下面 initFontSize 按 localStorage 覆盖 */
  showPrintMargin: false,
  useWorker: false,          /* 语法定位检查 worker 未打包，关掉以免 404 */
  wrap: false,
  tabSize: 4,
  useSoftTabs: true,
  displayIndentGuides: true,
});

/* language_tools 已在页面里用 script 标签同步加载，这三个选项必须在
   编辑器建好之后用 setOptions 给，构造参数里传会被 Ace 判定为拼写错误。 */
ace.require('ace/ext/language_tools');
srcEditor.setOptions({
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: false,
  enableSnippets: true,
});

/* ---------- 白天 / 夜晚配色 ----------
   页面配色全靠 CSS 变量：勾上就把 body 上的 day 类切过去，变量整组替换；
   Ace 编辑器的语法主题跟着一换（夜晚 one_dark / 白天 tomorrow）。选择记进
   localStorage，下次进页面直接是上次的模式。 */
const THEME_KEY = 'cpp-playground.theme';
function applyTheme(day) {
  document.body.classList.toggle('day', day);
  srcEditor.setTheme(day ? 'ace/theme/tomorrow' : 'ace/theme/one_dark');
  const cb = $('theme');
  if (cb) cb.checked = day;
}
(function initTheme() {
  let day = false;
  try { day = localStorage.getItem(THEME_KEY) === 'day'; } catch (e) {}
  applyTheme(day);
  const cb = $('theme');
  if (cb) cb.addEventListener('change', () => {
    applyTheme(cb.checked);
    try { localStorage.setItem(THEME_KEY, cb.checked ? 'day' : 'night'); } catch (e) {}
  });
})();

/* ---------- 编辑器字号 ----------
   Ace 的 setFontSize 收数字就按 px 算；选完记进 localStorage，下次进页面直接
   恢复。投影演示调大到 18/20 px 时行高跟着走，装订线和当前行高亮都是 Ace
   自己排的，不用额外改 CSS。 */
const FONT_KEY = 'cpp-playground.fontsize';
(function initFontSize() {
  const sel = $('fontsize');
  let px = parseInt(sel.value, 10) || 14;
  try {
    const v = parseInt(localStorage.getItem(FONT_KEY), 10);
    if (v >= 10 && v <= 32) px = v;
  } catch (e) { /* 隐私模式读不到就算了 */ }
  if (![...sel.options].some((o) => o.value === String(px))) px = 14;
  sel.value = String(px);
  srcEditor.setFontSize(px);
  sel.addEventListener('change', () => {
    const v = parseInt(sel.value, 10) || 14;
    srcEditor.setFontSize(v);
    try { localStorage.setItem(FONT_KEY, String(v)); } catch (e) {}
  });
})();

/* ---------- BGM：把当前执行行的个位弹成音符 ----------
   锚点按要求定：个位 1 = C 大调中音 do（C4）。2..7 顺下去 re mi fa sol la si，
   8 / 9 / 0 接着往高八度走（C5 D5 E5）——十位进位之前音高一路向上，整十行之后
   落回高八度的 do，听起来像一句句往上翻，而不是随机乱跳。
   只在调试会话里响：普通「编译并运行」没有行号可跟，自然也没音可弹。
   工具条的复选框能关掉，选择记进 localStorage。 */
const BGM_KEY = 'cpp-playground.bgm';
/* 相对 C4 的半音数：大调 1234567 = 0 2 4 5 7 9 11，8 9 0 是下一八度的 1 2 3 */
const BGM_SEMITONE = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12, 9: 14, 0: 16 };
const bgm = { ac: null, lastDigit: -1, lastAt: 0, notes: 0 };

function bgmOn() { const cb = $('bgm'); return !!(cb && cb.checked); }

function bgmNote(line) {
  if (!bgmOn() || line <= 0) return;
  const d = line % 10;
  const now = performance.now();
  /* 同一个音不重复敲：停在某行时 tick 每 50 ms 就来一趟；两次发声之间至少隔
     45 ms：全速档一秒能划过几千行，不限流就成了一堵噪音墙，AudioNode 也会堆。 */
  if (d === bgm.lastDigit && now - bgm.lastAt < 400) return;
  if (now - bgm.lastAt < 45) return;
  bgm.lastDigit = d;
  bgm.lastAt = now;

  let ac = bgm.ac;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = bgm.ac = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
  }
  /* 浏览器不让没有用户手势的 AudioContext 起播；点「编译并调试」本身就是手势，
     但自动播放策略偶尔还是会把新开的 ctx 停在 suspended，这里补一次 resume。 */
  if (ac.state === 'suspended') ac.resume().catch(() => {});

  const f = 261.6256 * Math.pow(2, BGM_SEMITONE[d] / 12);   /* A4=440 十二平均律下的 C4 */
  const t = ac.currentTime;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(0.16, t + 0.006);        /* 几毫秒起音，接近拨弦/音盒 */
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);  /* 0.3 s 收干净，音符之间不糊 */
  amp.connect(ac.destination);
  /* 三角波基音 + 高八度正弦泛音：单振荡器太"嘟嘟叫"，叠一层八度才有音乐盒味 */
  [[f, 'triangle', 1], [f * 2, 'sine', 0.35]].forEach((p) => {
    const o = ac.createOscillator();
    o.type = p[1];
    o.frequency.value = p[0];
    const g = ac.createGain();
    g.gain.value = p[2];
    o.connect(g);
    g.connect(amp);
    o.start(t);
    o.stop(t + 0.34);
  });
  bgm.notes++;
}

(function initBgm() {
  const cb = $('bgm');
  if (!cb) return;
  try {
    const v = localStorage.getItem(BGM_KEY);
    if (v !== null) cb.checked = v === 'on';
  } catch (e) { /* 隐私模式读不到就按 HTML 里的默认值 */ }
  cb.addEventListener('change', () => {
    try { localStorage.setItem(BGM_KEY, cb.checked ? 'on' : 'off'); } catch (e) {}
    bgm.lastDigit = -1;
    /* 勾上的时候给一声确认，不然安静的页面上看不出到底生效没有 */
    if (cb.checked) bgmNote(dbg.lastLine > 0 ? dbg.lastLine : 1);
  });
})();

function setSource(text) {
  srcEditor.setValue(text, -1);
  srcEditor.clearSelection();
  srcEditor.gotoLine(1, 0, false);
  clearAllBreakpoints();   /* 换源码了，按行号画的断点不再有意义 */
  updateSrcLen();
}
function updateSrcLen() {
  const v = srcEditor.getValue();
  $('srclen').textContent = `${v.length} 字符 / ${v.split('\n').length} 行`;
}

const EXAMPLES = {
  '手工冒泡排序（慢速演示）': {
    group: '慢速演示',
    stdin: '',
    code: `#include <iostream>
#include <iomanip>

// 30 个数据，手工冒泡。比较 + 交换约 425 / 214 次，
// 双重循环会把当前行高亮一格一格往前推，适合配合「每行停留」看慢动作。
int main() {
    int a[30] = {42, 17, 88, 3, 65, 29, 51, 74, 8, 93,
                 36, 12, 60, 47, 21, 79, 5, 68, 34, 56,
                 90, 15, 63, 40, 72, 26, 85, 11, 49, 23};
    int n = 30;

    std::cout << "排序前：\\n";
    for (int i = 0; i < n; ++i) {
        std::cout << std::setw(4) << a[i];
        if (i % 10 == 9) std::cout << "\\n";
    }
    std::cout << "\\n";

    int cmp = 0, swp = 0;
    for (int i = 0; i < n - 1; ++i) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; ++j) {
            ++cmp;
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                ++swp; swapped = true;
            }
        }
        std::cout << "第 " << i + 1 << " 趟后：";
        for (int k = 0; k < n; ++k) std::cout << std::setw(4) << a[k];
        std::cout << "\\n";
        if (!swapped) break;
    }

    std::cout << "排序完成：比较 " << cmp << " 次，交换 " << swp << " 次。\\n";
    return 0;
}
`,
  },
  '三种排序对比（插入/冒泡/快排）': {
    group: '排序',
    stdin: '',
    code: `#include <iostream>
#include <vector>
#include <algorithm>
#include <string>
using namespace std;

/* 三种排序统计的基本操作不一样，单位也得跟着变：插入是「移动」（后移 + 落位各算一次），
   冒泡和快排是「交换」。传字符串进去，输出就不至于把交换说成移动。 */
void show(const string& tag, const vector<int>& a, long long cmp, long long mv,
          const string& unit) {
    cout << tag << "：比较 " << cmp << " 次，" << unit << " " << mv << " 次  ";
    for (int x : a) cout << x << ' ';
    cout << "\\n";
}

void insertionSort(vector<int> a) {
    long long cmp = 0, mv = 0;
    for (int i = 1; i < (int)a.size(); ++i) {
        int x = a[i], j = i - 1;
        while (j >= 0) {
            ++cmp;
            if (a[j] <= x) break;
            a[j + 1] = a[j]; ++mv; --j;      // 后移一位
        }
        a[j + 1] = x; ++mv;
    }
    show("插入排序", a, cmp, mv, "移动");
}

void bubbleSort(vector<int> a) {
    long long cmp = 0, swp = 0;
    int n = (int)a.size();
    for (int i = 0; i < n - 1; ++i) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; ++j) {
            ++cmp;
            if (a[j] > a[j + 1]) { swap(a[j], a[j + 1]); ++swp; swapped = true; }
        }
        if (!swapped) break;                  // 一整趟没交换就已经有序
    }
    show("冒泡排序", a, cmp, swp, "交换");
}

long long qcmp = 0, qswp = 0;                  // 快排的比较/交换次数（递归里累加，图省事放全局）
int partition(vector<int>& a, int l, int r) { // Lomuto：拿最右边当基准
    int x = a[r], i = l;
    for (int j = l; j < r; ++j) {
        ++qcmp;
        if (a[j] <= x) { swap(a[i], a[j]); ++i; ++qswp; }
    }
    swap(a[i], a[r]); ++qswp;                  // 基准落位也算一次交换
    return i;
}
void quickSort(vector<int>& a, int l, int r) {
    if (l >= r) return;
    int p = partition(a, l, r);
    quickSort(a, l, p - 1);
    quickSort(a, p + 1, r);
}

int main() {
    vector<int> a = {9, 7, 5, 3, 1, 8, 6, 4, 2, 0};
    cout << "原始数据：";
    for (int x : a) cout << x << ' ';
    cout << "\\n\\n";
    insertionSort(a);
    bubbleSort(a);
    vector<int> b = a;
    quickSort(b, 0, (int)b.size() - 1);
    show("快速排序", b, qcmp, qswp, "交换");
    cout << "\\n同一组数据，插入和冒泡都是 O(n^2)，快排这里比较次数明显更少。\\n";
    return 0;
}
`,
  },
  '归并排序 + 逆序对计数': {
    group: '排序',
    stdin: '',
    code: `#include <iostream>
#include <vector>
using namespace std;

// 归并的同时数逆序对：右半的元素要先出来时，左半剩下的 m-i 个都比它大
long long mergeSort(vector<int>& a, vector<int>& tmp, int l, int r) {
    if (r - l <= 1) return 0;
    int m = (l + r) / 2;
    long long cnt = mergeSort(a, tmp, l, m) + mergeSort(a, tmp, m, r);
    int i = l, j = m, k = l;
    while (i < m && j < r) {
        if (a[i] <= a[j]) tmp[k++] = a[i++];
        else { tmp[k++] = a[j++]; cnt += m - i; }
    }
    while (i < m) tmp[k++] = a[i++];
    while (j < r) tmp[k++] = a[j++];
    for (int t = l; t < r; ++t) a[t] = tmp[t];
    return cnt;
}

int main() {
    vector<int> a = {5, 3, 8, 1, 9, 2, 7, 4, 6, 0};
    vector<int> tmp(a.size());
    cout << "排序前：";
    for (int x : a) cout << x << ' ';
    cout << "\\n";
    long long cnt = mergeSort(a, tmp, 0, (int)a.size());
    cout << "排序后：";
    for (int x : a) cout << x << ' ';
    cout << "\\n";
    cout << "逆序对总数 = " << cnt << "\\n";
    return 0;
}
`,
  },
  '顺序表：插入删除 + 二分查找': {
    group: '线性表',
    stdin: '',
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int binSearch(const vector<int>& a, int key) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;          // 写 (lo + hi) / 2 会溢出
        if (a[mid] == key) return mid;
        if (a[mid] < key) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> a = {1, 3, 5, 7, 9, 11, 13, 15};
    a.insert(a.begin() + 3, 6);                // 中间插入：后面整体后移，O(n)
    cout << "下标 3 插入 6：";
    for (int x : a) cout << x << ' ';
    cout << "\\n";
    a.erase(a.begin());                        // 删头：整体前移，O(n)
    cout << "删掉首元素：";
    for (int x : a) cout << x << ' ';
    cout << "\\n\\n";

    for (int key : {7, 10, 15, 1}) {
        int p = binSearch(a, key);
        cout << "二分查 " << key << " -> ";
        if (p < 0) cout << "不存在\\n"; else cout << "下标 " << p << "\\n";
    }
    cout << "lower_bound(8) 的下标 = "
         << lower_bound(a.begin(), a.end(), 8) - a.begin() << "\\n";
    return 0;
}
`,
  },
  '手写单链表：逆置 + 快慢指针': {
    group: '线性表',
    stdin: '',
    code: `#include <iostream>
using namespace std;

struct Node {
    int val;
    Node* next;
    Node(int v) : val(v), next(nullptr) {}
};

void pushFront(Node*& head, int v) {          // 头插：传引用改头指针
    Node* n = new Node(v);
    n->next = head;
    head = n;
}

Node* reverse(Node* head) {                   // 三指针原地逆置
    Node* prev = nullptr;
    while (head) {
        Node* nxt = head->next;
        head->next = prev;
        prev = head;
        head = nxt;
    }
    return prev;
}

Node* middle(Node* head) {                    // 快慢指针：fast 到头时 slow 在中点
    Node *slow = head, *fast = head;
    while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }
    return slow;
}

bool hasCycle(Node* head) {                   // 快慢指针相遇即有环
    Node *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next; fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

void print(Node* h) {
    for (; h; h = h->next) cout << h->val << (h->next ? " -> " : "\\n");
}

int main() {
    Node* head = nullptr;
    for (int v : {5, 4, 3, 2, 1}) pushFront(head, v);
    cout << "原链表："; print(head);
    cout << "中点值：" << middle(head)->val << "\\n";
    cout << "有环吗：" << (hasCycle(head) ? "有" : "没有") << "\\n";
    head = reverse(head);
    cout << "逆置后："; print(head);
    while (head) { Node* d = head; head = head->next; delete d; }
    return 0;
}
`,
  },
  '栈：括号匹配 + 逆波兰求值': {
    group: '栈与队列',
    stdin: '',
    code: `#include <iostream>
#include <stack>
#include <string>
#include <sstream>
using namespace std;

bool bracketOK(const string& s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else if (c == ')' || c == ']' || c == '}') {
            if (st.empty()) return false;
            char o = st.top(); st.pop();
            if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{'))
                return false;
        }
    }
    return st.empty();                        // 剩括号说明没配完
}

int evalRPN(const string& expr) {             // 逆波兰：操作数压栈，运算符弹两个
    stack<int> st;
    istringstream in(expr);
    string tok;
    while (in >> tok) {
        if (tok == "+" || tok == "-" || tok == "*" || tok == "/") {
            int b = st.top(); st.pop();
            int a = st.top(); st.pop();
            int v = tok == "+" ? a + b : tok == "-" ? a - b : tok == "*" ? a * b : a / b;
            st.push(v);
        } else {
            st.push(stoi(tok));
        }
    }
    return st.top();
}

int main() {
    for (string s : {"({[]})", "([)]", "((()", "{[()]}"})
        cout << s << " : " << (bracketOK(s) ? "匹配" : "不匹配") << "\\n";
    cout << "\\n";
    cout << "3 + (4 - 2) * 5 = " << evalRPN("3 4 2 - 5 * +") << "\\n";
    cout << "10 / (9 - 7) + 1 = " << evalRPN("10 9 7 - / 1 +") << "\\n";
    return 0;
}
`,
  },
  '队列：循环队列 + 约瑟夫环': {
    group: '栈与队列',
    stdin: '',
    code: `#include <iostream>
#include <queue>
using namespace std;

struct CircQueue {                            // 定长数组 + 头尾下标取模，避免「假满」
    static const int CAP = 8;
    int data[CAP];
    int head = 0, tail = 0, cnt = 0;
    bool push(int v) {
        if (cnt == CAP) return false;
        data[tail] = v;
        tail = (tail + 1) % CAP;
        ++cnt;
        return true;
    }
    int pop() {
        int v = data[head];
        head = (head + 1) % CAP;
        --cnt;
        return v;
    }
    bool empty() const { return cnt == 0; }
};

int main() {
    CircQueue q;
    for (int i = 1; i <= 10; ++i)
        if (!q.push(i)) cout << i << " 入队失败：队列已满\\n";
    cout << "依次出队：";
    while (!q.empty()) cout << q.pop() << ' ';
    cout << "\\n\\n";

    const int n = 10, m = 3;                  // 约瑟夫环：数到 m 的出列
    queue<int> circle;
    for (int i = 1; i <= n; ++i) circle.push(i);
    cout << "出列顺序（n=10, m=3）：";
    while (circle.size() > 1) {
        for (int i = 1; i < m; ++i) { circle.push(circle.front()); circle.pop(); }
        cout << circle.front() << ' ';
        circle.pop();
    }
    cout << "\\n幸存者：" << circle.front() << "\\n";
    return 0;
}
`,
  },
  '二叉树：先中后序 + 层序遍历': {
    group: '树',
    stdin: '',
    code: `#include <iostream>
#include <queue>
#include <string>
using namespace std;

struct TNode {
    int val;
    TNode *l, *r;
    TNode(int v) : val(v), l(nullptr), r(nullptr) {}
};

TNode* insert(TNode* root, int v) {           // 按 BST 规则建树，左小右大
    if (!root) return new TNode(v);
    if (v < root->val) root->l = insert(root->l, v);
    else root->r = insert(root->r, v);
    return root;
}

void pre(TNode* r, string& s) { if (!r) return; s += to_string(r->val) + ' '; pre(r->l, s); pre(r->r, s); }
void ino(TNode* r, string& s) { if (!r) return; ino(r->l, s); s += to_string(r->val) + ' '; ino(r->r, s); }
void post(TNode* r, string& s){ if (!r) return; post(r->l, s); post(r->r, s); s += to_string(r->val) + ' '; }

void level(TNode* root, string& s) {          // 层序靠队列，不是递归
    if (!root) return;
    queue<TNode*> q;
    q.push(root);
    while (!q.empty()) {
        TNode* u = q.front(); q.pop();
        s += to_string(u->val) + ' ';
        if (u->l) q.push(u->l);
        if (u->r) q.push(u->r);
    }
}

void freeAll(TNode* r) { if (!r) return; freeAll(r->l); freeAll(r->r); delete r; }

int main() {
    TNode* root = nullptr;
    for (int v : {8, 3, 10, 1, 6, 14, 4, 7, 13}) root = insert(root, v);
    string s;
    s.clear(); pre(root, s);   cout << "先序：" << s << "\\n";
    s.clear(); ino(root, s);   cout << "中序：" << s << "  （BST 的中序就是有序表）\\n";
    s.clear(); post(root, s);  cout << "后序：" << s << "\\n";
    s.clear(); level(root, s); cout << "层序：" << s << "\\n";
    freeAll(root);
    return 0;
}
`,
  },
  '二叉搜索树：插入删除 + 高度': {
    group: '树',
    stdin: '',
    code: `#include <iostream>
#include <algorithm>
using namespace std;

struct BST {
    int v;
    BST *l, *r;
    BST(int x) : v(x), l(nullptr), r(nullptr) {}
};

BST* insert(BST* p, int x) {
    if (!p) return new BST(x);
    if (x < p->v) p->l = insert(p->l, x);
    else if (x > p->v) p->r = insert(p->r, x);
    return p;
}

BST* findMin(BST* p) { while (p->l) p = p->l; return p; }

BST* erase(BST* p, int x) {
    if (!p) return nullptr;
    if (x < p->v) p->l = erase(p->l, x);
    else if (x > p->v) p->r = erase(p->r, x);
    else if (p->l && p->r) {                  // 情况三：两个孩子，用右子树最小值顶替
        BST* t = findMin(p->r);
        p->v = t->v;
        p->r = erase(p->r, t->v);
    } else {                                  // 情况一/二：叶子或独子，直接摘掉
        BST* t = p;
        p = p->l ? p->l : p->r;
        delete t;
    }
    return p;
}

int height(BST* p) { return p ? 1 + max(height(p->l), height(p->r)) : 0; }
void ino(BST* p) { if (!p) return; ino(p->l); cout << p->v << ' '; ino(p->r); }

int main() {
    BST* t = nullptr;
    for (int x : {50, 30, 70, 20, 40, 60, 80, 35, 45}) t = insert(t, x);
    cout << "中序："; ino(t); cout << "\\n高度：" << height(t) << "\\n\\n";
    t = erase(t, 30);                         // 30 有两个孩子
    cout << "删 30 后："; ino(t); cout << "\\n";
    t = erase(t, 20); t = erase(t, 80);       // 叶子
    cout << "删 20、80 后："; ino(t); cout << "\\n高度：" << height(t) << "\\n";
    return 0;
}
`,
  },
  '堆：合并果子（优先队列）': {
    group: '树',
    stdin: '',
    code: `#include <iostream>
#include <queue>
#include <vector>
#include <functional>
using namespace std;

int main() {
    vector<int> w = {1, 3, 5, 2, 8, 4, 7, 6};
    // 小顶堆：每次拿最小的两堆合并，就是哈夫曼贪心
    priority_queue<int, vector<int>, greater<int> > pq(w.begin(), w.end());

    long long cost = 0;
    cout << "初始重量：";
    for (int x : w) cout << x << ' ';
    cout << "\\n合并过程：";
    while (pq.size() > 1) {
        int a = pq.top(); pq.pop();
        int b = pq.top(); pq.pop();
        cost += a + b;
        cout << a << "+" << b << "=" << a + b << "  ";
        pq.push(a + b);
    }
    cout << "\\n最小总代价 = " << cost << "\\n";
    return 0;
}
`,
  },
  '图：邻接表 + DFS/BFS': {
    group: '图',
    stdin: '',
    code: `#include <iostream>
#include <vector>
#include <queue>
#include <functional>
#include <algorithm>
using namespace std;

int main() {
    const int n = 6;
    vector<vector<int> > adj(n);
    int edges[][2] = {{0,1}, {0,2}, {1,3}, {2,3}, {3,4}, {4,5}, {2,5}};
    for (int i = 0; i < 7; ++i) {             // 无向图：两条边都存
        adj[edges[i][0]].push_back(edges[i][1]);
        adj[edges[i][1]].push_back(edges[i][0]);
    }
    cout << "邻接表：\\n";
    for (int i = 0; i < n; ++i) {
        cout << "  " << i << ": ";
        for (size_t k = 0; k < adj[i].size(); ++k) cout << adj[i][k] << ' ';
        cout << "\\n";
    }

    vector<bool> vis(n, false);
    cout << "\\nDFS（递归）：";
    function<void(int)> dfs = [&](int u) {
        vis[u] = true;
        cout << u << ' ';
        for (size_t k = 0; k < adj[u].size(); ++k) if (!vis[adj[u][k]]) dfs(adj[u][k]);
    };
    dfs(0);

    fill(vis.begin(), vis.end(), false);
    cout << "\\nBFS（队列）：";
    queue<int> q;
    q.push(0); vis[0] = true;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        cout << u << ' ';
        for (size_t k = 0; k < adj[u].size(); ++k) {
            int v = adj[u][k];
            if (!vis[v]) { vis[v] = true; q.push(v); }
        }
    }
    cout << "\\n";
    return 0;
}
`,
  },
  '图：Dijkstra 最短路': {
    group: '图',
    stdin: '',
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    const int n = 5, INF = 1e9;
    vector<vector<pair<int, int> > > g(n);    // g[u] = {v, w}
    int e[][3] = {{0,1,4}, {0,2,1}, {2,1,2}, {1,3,1}, {2,3,5}, {3,4,3}, {0,3,100}};
    for (int i = 0; i < 7; ++i) g[e[i][0]].push_back(make_pair(e[i][1], e[i][2]));

    vector<int> d(n, INF);
    vector<int> pre(n, -1);                   // 记录前驱，最后能还原路径
    d[0] = 0;
    priority_queue<pair<int, int>, vector<pair<int, int> >, greater<pair<int, int> > > pq;
    pq.push(make_pair(0, 0));
    while (!pq.empty()) {
        int du = pq.top().first, u = pq.top().second; pq.pop();
        if (du > d[u]) continue;              // 旧记录，跳过
        for (size_t k = 0; k < g[u].size(); ++k) {
            int v = g[u][k].first, w = g[u][k].second;
            if (d[v] > du + w) {
                d[v] = du + w;
                pre[v] = u;
                pq.push(make_pair(d[v], v));
            }
        }
    }

    for (int i = 0; i < n; ++i) {
        cout << "0 -> " << i << " = " << (d[i] >= INF ? -1 : d[i]) << "  路径 ";
        vector<int> path;
        for (int x = i; x != -1; x = pre[x]) path.push_back(x);
        for (int k = (int)path.size() - 1; k >= 0; --k) cout << path[k] << (k ? " -> " : "");
        cout << "\\n";
    }
    cout << "\\n注意 0->3 直接那条 100 的边不会用，走 0->2->1->3 只要 4。\\n";
    return 0;
}
`,
  },
  '并查集：连通块个数': {
    group: '图',
    stdin: '',
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

struct DSU {
    vector<int> fa, sz;
    DSU(int n) : fa(n), sz(n, 1) { for (int i = 0; i < n; ++i) fa[i] = i; }

    int find(int x) {                         // 路径减半：边找边把父亲跳一级
        while (fa[x] != x) { fa[x] = fa[fa[x]]; x = fa[x]; }
        return x;
    }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);        // 按大小合并，树不会退化成链
        fa[b] = a;
        sz[a] += sz[b];
        return true;
    }
};

int main() {
    DSU d(8);
    int pairs[][2] = {{0,1}, {1,2}, {3,4}, {5,6}, {6,7}, {2,3}, {0,4}};
    for (int i = 0; i < 7; ++i)
        cout << pairs[i][0] << "、" << pairs[i][1] << " 合并"
             << (d.unite(pairs[i][0], pairs[i][1]) ? "成功" : "（本来就连通）") << "\\n";

    int blocks = 0;
    for (int i = 0; i < 8; ++i) if (d.find(i) == i) ++blocks;
    cout << "\\n连通块个数 = " << blocks << "\\n";
    cout << "0 和 4 连通吗：" << (d.find(0) == d.find(4) ? "是" : "否") << "\\n";
    cout << "0 和 5 连通吗：" << (d.find(0) == d.find(5) ? "是" : "否") << "\\n";
    return 0;
}
`,
  },
  'KMP：next 表与所有匹配位置': {
    group: '查找与字符串',
    stdin: '',
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

// pi[i] = p[0..i] 里「最长的相等公共前后缀」长度，失配时靠它回退，不回读文本
vector<int> prefixFunction(const string& p) {
    int n = (int)p.size();
    vector<int> pi(n, 0);
    for (int i = 1, j = 0; i < n; ++i) {
        while (j > 0 && p[i] != p[j]) j = pi[j - 1];
        if (p[i] == p[j]) ++j;
        pi[i] = j;
    }
    return pi;
}

int main() {
    string s = "abababcaabababcab", p = "ababc";
    vector<int> pi = prefixFunction(p);
    cout << "模式串 p = " << p << "\\nnext 表：";
    for (size_t i = 0; i < pi.size(); ++i) cout << pi[i] << ' ';
    cout << "\\n\\n";

    cout << "KMP 命中位置：";
    for (int i = 0, j = 0; i < (int)s.size(); ++i) {
        while (j > 0 && s[i] != p[j]) j = pi[j - 1];
        if (s[i] == p[j]) ++j;
        if (j == (int)p.size()) { cout << i - j + 1 << ' '; j = pi[j - 1]; }
    }
    cout << "\\n朴素对照：";
    for (int i = 0; i + (int)p.size() <= (int)s.size(); ++i)
        if (s.compare(i, p.size(), p) == 0) cout << i << ' ';
    cout << "\\n两种结果应当完全一致。\\n";
    return 0;
}
`,
  },
  '散列表：除留余数 + 拉链法': {
    group: '查找与字符串',
    stdin: '',
    code: `#include <iostream>
#include <vector>
#include <list>
#include <string>
#include <utility>
using namespace std;

const int B = 7;                              // 桶数

struct HashTable {
    vector<list<pair<string, int> > > bucket;
    HashTable() : bucket(B) {}

    int idx(const string& k) const {          // 多项式滚动哈希，再除留余数
        unsigned h = 0;
        for (size_t i = 0; i < k.size(); ++i) h = h * 131u + (unsigned)k[i];
        return (int)(h % (unsigned)B);
    }
    void put(const string& k, int v) {
        for (list<pair<string, int> >::iterator it = bucket[idx(k)].begin();
             it != bucket[idx(k)].end(); ++it)
            if (it->first == k) { it->second = v; return; }
        bucket[idx(k)].push_back(make_pair(k, v));
    }
    int* get(const string& k) {
        for (list<pair<string, int> >::iterator it = bucket[idx(k)].begin();
             it != bucket[idx(k)].end(); ++it)
            if (it->first == k) return &it->second;
        return nullptr;
    }
};

int main() {
    HashTable t;
    t.put("apple", 3);  t.put("banana", 7); t.put("cherry", 1);
    t.put("durian", 9); t.put("egg", 2);    t.put("fig", 5);
    t.put("apple", 4);                      // 同键覆盖

    cout << "桶分布（mod " << B << "，冲突挂在同一条链上）：\\n";
    for (int i = 0; i < B; ++i) {
        cout << "  " << i << ":";
        for (list<pair<string, int> >::iterator it = t.bucket[i].begin();
             it != t.bucket[i].end(); ++it)
            cout << " " << it->first << "(" << it->second << ")";
        cout << "\\n";
    }
    const char* keys[] = {"apple", "fig", "grape"};
    cout << "\\n";
    for (int i = 0; i < 3; ++i) {
        int* v = t.get(keys[i]);
        cout << keys[i] << " -> ";
        if (v) cout << *v << "\\n"; else cout << "查无此词\\n";
    }
    return 0;
}
`,
  },
  '万能头 bits/stdc++.h 演示': {
    group: '竞赛风格',
    stdin: '',
    code: `// libc++ 本身没有 bits/stdc++.h，这个环境在 sysroot 解包后往虚拟文件系统里
// 补了一个，内容是一串实测能编过的标准库头。线程/文件系统类不在里面：
// wasi 侧没有 pthread，收了反而会让链接期出未定义符号。
#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> a(10);
    iota(a.begin(), a.end(), 1);            // <numeric>
    mt19937 g(20261105);                    // <random>，固定种子所以结果可复现
    shuffle(a.begin(), a.end(), g);         // <algorithm>
    cout << "打乱后：";
    for (int x : a) cout << x << ' ';
    cout << "\\n";

    sort(a.begin(), a.end());
    cout << "排序后：";
    for (int x : a) cout << x << ' ';
    cout << "\\n";

    set<int> s(a.begin(), a.end());         // <set>
    unordered_map<int, int> cnt;            // <unordered_map>
    for (int x : a) ++cnt[x];
    cout << "不同元素 " << s.size() << " 个，累加和 "
         << accumulate(a.begin(), a.end(), 0) << "，最大 " << *a.rbegin() << "\\n";
    cout << fixed << setprecision(3) << "sqrt(2) = " << sqrt(2.0) << "\\n";
    return 0;
}
`,
  },
  'STL 容器与算法': {
    group: 'STL',
    stdin: '',
    code: `#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
#include <iomanip>

int main() {
    std::vector<int> v{5, 3, 9, 1, 7, 2, 8};

    std::sort(v.begin(), v.end());
    long long sum = std::accumulate(v.begin(), v.end(), 0LL);
    auto [lo, hi] = std::minmax_element(v.begin(), v.end());

    std::cout << "sorted : ";
    for (int x : v) std::cout << std::setw(3) << x;
    std::cout << "\\nsum    : " << sum
              << "\\nmin,max: " << *lo << ", " << *hi
              << "\\nsize   : " << v.size() << std::endl;
    return 0;
}
`,
  },
  '读入 stdin + 中文输出': {
    group: '基础',
    stdin: `3
Alice 92
Bob 78
Carol 88
`,
    code: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

struct Student { std::string name; int score; };

int main() {
    int n;
    if (!(std::cin >> n)) { std::cerr << "没有读到人数\\n"; return 1; }

    std::vector<Student> a(n);
    for (auto& s : a) std::cin >> s.name >> s.score;

    std::sort(a.begin(), a.end(),
              [](const Student& x, const Student& y) { return x.score > y.score; });

    std::cout << "成绩排名（降序）:\\n";
    for (size_t i = 0; i < a.size(); ++i)
        std::cout << i + 1 << ". " << a[i].name << "  " << a[i].score << "\\n";

    double avg = 0;
    for (const auto& s : a) avg += s.score;
    std::cout << "平均分: " << avg / a.size() << "\\n";
}
`,
  },
  'string / map / sstream': {
    group: 'STL',
    stdin: 'hello world hello wasm world\n',
    code: `#include <iostream>
#include <sstream>
#include <string>
#include <map>

int main() {
    std::map<std::string, int> freq;
    std::string line, word;
    while (std::getline(std::cin, line)) {
        std::istringstream iss(line);
        while (iss >> word) ++freq[word];
    }
    std::cout << "词频统计:\\n";
    for (const auto& [w, c] : freq) std::cout << w << " -> " << c << "\\n";
}
`,
  },
  '递归 + 大栈': {
    group: '基础',
    stdin: '30\n',
    code: `#include <iostream>
#include <vector>

unsigned long long fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }

int main() {
    int n; std::cin >> n;
    std::cout << "fib(" << n << ") = " << fib(n) << std::endl;
    std::vector<double> buf(1 << 20, 0.5);
    double s = 0; for (double d : buf) s += d;
    std::cout << "1M 个 double 的和 = " << s << std::endl;
}
`,
  },
  '死循环（演示超时被终止）': {
    group: '演示',
    stdin: '',
    code: `#include <iostream>
int main() {
    std::cout << "开始跑，不会停" << std::endl;
    long long i = 0;
    while (true) { ++i; }
    std::cout << i << std::endl;
}
`,
  },
  '编译错误（演示诊断输出）': {
    group: '演示',
    stdin: '',
    code: `#include <iostream>
#include <vector>
int main() {
    std::vector<int> v;
    v.adn(1);            // 拼错了
    int n = "abc";       // 类型不对
    std::cout << v[0] << n;
}
`,
  },
};

/* ------------------------------------------------------------------ */
/* 状态与输出                                                          */
/* ------------------------------------------------------------------ */
let decoder = null;

function newDecodeSession() {
  if (decoder) try { outEl.value += decoder.decode(); } catch (e) {}
  decoder = new TextDecoder('utf-8', { fatal: false });
}
function pushBytes(bytes) {
  if (!decoder) newDecodeSession();
  outEl.value += decoder.decode(bytes, { stream: true });
  outEl.scrollTop = outEl.scrollHeight;
  $('outlen').textContent = outEl.value.length + ' 字符';
}
function closeDecodeSession() {
  if (decoder) { outEl.value += decoder.decode(); decoder = null; }
}

/* 每次点「编译并运行 / 编译并调试」都从空输出开始。丢弃上一次的解码头，
   免得它把残留的半个多字节序列刷进新框；输出长度计数一并清零。 */
function clearOutput() {
  decoder = null;
  outEl.value = '';
  outEl.scrollTop = 0;
  $('outlen').textContent = '';
}

function say(text, cls) {
  msgEl.textContent = text;
  msgEl.className = cls || '';
}
function setDot(kind) { dotEl.className = 'dot' + (kind ? ' ' + kind : ''); }

/* ---------- 状态面板四项指标 ---------- */
const METRICS = { exit: $('m-exit'), compile: $('m-compile'), run: $('m-run'), mem: $('m-mem') };
function metric(key, text, cls, tip) {
  const el = METRICS[key];
  if (!el) return;
  el.textContent = text;
  el.className = cls || '';
  el.title = tip || '';
}
function resetMetrics() {
  for (const k of Object.keys(METRICS)) metric(k, '—', '');
}

const enc = new TextEncoder();

/* ------------------------------------------------------------------ */
/* Worker 管理                                                         */
/* ------------------------------------------------------------------ */
let compileWorker = null;
let workerReady = false;
let readyResolve = null, readyReject = null;
let readyPromise = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });

let runWorker = null;
let watchdog = null;
let currentRun = null;

function startCompileWorker() {
  workerReady = false;
  readyPromise = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });
  if (compileWorker) compileWorker.terminate();
  compileWorker = new Worker('js/compile.worker.js');
  compileWorker.onmessage = onCompileMessage;
  compileWorker.onerror = (e) => {
    setDot('bad');
    say('Worker 出错：' + e.message, 'err');
  };
  setDot('busy');
  say('正在初始化工具链（首次需下载约 58 MB）…');
  compileWorker.postMessage({ type: 'init', base: BASE, assets: ASSETS });
}

function onCompileMessage(ev) {
  const m = ev.data;
  switch (m.type) {
    case 'progress': say(m.text + '…'); break;
    case 'write': pushBytes(new Uint8Array(m.bytes)); break;
    case 'ready':
      workerReady = true;
      setDot('ready');
      say(`工具链就绪（${(m.initMs / 1000).toFixed(1)} s，sysroot 装入 ${m.sysrootFiles} 个文件）`, 'ok');
      readyResolve();
      break;
    case 'stage':
      if (m.stage === 'compile') say('编译中（clang -cc1）…');
      else if (m.stage === 'compile-debug') say('调试构建中（出 IR → 插桩 → 目标文件 → 链接）…');
      break;
    case 'result':
      if (m.ok) {
        lastCompileMs = m.ms;
        /* 观察窗的补全名单跟着每次插桩构建刷新（普通运行没有变量表，跳过） */
        if (m.vars) fillWatchNames(m.vars);
        compileResolve && compileResolve({
          wasm: m.wasm, lines: m.lines || null,
          vars: m.vars || null, lineVars: m.lineVars || null,
        });
      }
      else { compileReject && compileReject({ phase: m.phase, ms: m.ms, exitCode: m.exitCode }); }
      break;
    case 'error':
      setDot('bad');
      say('工具链没能装入，原因见输出框', 'err');
      /* 把页面实际请求的 assets 前缀一起打出来：部署出问题时，这一行和上面的
         完整 URL 能直接对上是路径错了（404）、被中间层改了（返回 HTML）、
         还是压根没发出去（证书/CSP/COEP）。 */
      outEl.value += '\n' + m.message + '\n（资源前缀 BASE = ' + BASE + '，' +
        '可在控制台执行 fetch(BASE + "clang.wasm", {method: "HEAD"}).then(r => console.log(r.status, r.headers.get("content-type"), r.headers.get("content-length"))) 自查）\n';
      if (readyReject) readyReject(new Error(m.message));
      compileReject && compileReject({ jsError: m.message });
      break;
  }
}

let lastCompileMs = 0;
let compileResolve = null, compileReject = null;

function compile(code, debug) {
  return new Promise((resolve, reject) => {
    compileResolve = resolve;
    compileReject = (err) => { reject(err); compileResolve = null; compileReject = null; };
    const opts = {
      std: $('std').value,
      optimize: $('opt').value,
      stackSize: parseInt($('stack').value, 10),
      flags: $('extra').value.split(/\s+/).filter(Boolean),
      filename: 'main.cc', obj: 'main.o', output: 'main.wasm',
      clang: ASSETS.clang, lld: ASSETS.lld,
      debug: !!debug,
    };
    if (debug) { opts.obj = 'main.dbg.o'; opts.output = 'main.dbg.wasm'; }
    compileWorker.postMessage({ type: 'compile', code, opts });
  }).finally(() => { compileResolve = null; compileReject = null; });
}

function runProgram(wasmBytes, stdinText, timeoutMs, ctl) {
  return new Promise((resolve) => {
    if (runWorker) runWorker.terminate();
    runWorker = new Worker('js/run.worker.js');
    runWorker.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === 'write') pushBytes(new Uint8Array(m.bytes));
      /* 只有调试构建会发这条：把用户模块那块共享线性内存交过来给悬停和观察窗读 */
      if (m.type === 'guest') setGuestMemory(m.sab);
      if (m.type === 'exit') {
        clearWatchdog();
        runWorker.terminate();
        runWorker = null;
        resolve({ ...m, killed: false });
      }
    };
    runWorker.onerror = (e) => {
      clearWatchdog();
      resolve({ code: 127, note: e.message, ms: 0, memoryBytes: 0, killed: false });
    };
    currentRun = { resolve };
    /* 调试会话（ctl 非空）不装看门狗：那是给人一步步看的，停在某行等人放行、
       降速睡过去都不该算成「程序在跑」。跑得慢或死循环也由用户自己用「停止 /
       退出调试」结束（dbgStopRun 会结掉这个 await）。只有普通「编译并运行」
       才按 运行超时(ms) 强杀 Worker。 */
    if (!ctl) {
      watchdog = setTimeout(() => {
        runWorker.terminate();
        runWorker = null;
        resolve({ code: null, killed: true, ms: timeoutMs, memoryBytes: 0 });
      }, timeoutMs);
    }
    const buf = wasmBytes.buffer.slice(0);   /* 复制，原字节留给下次「仅运行」 */
    runWorker.postMessage(
      { type: 'run', base: BASE, name: 'main.wasm', stdin: enc.encode(stdinText), wasm: buf, ctl: ctl || null },
      [buf]);
  });
}

function clearWatchdog() {
  if (!watchdog) return;
  if (typeof watchdog === 'number') clearInterval(watchdog);
  else clearTimeout(watchdog);
  watchdog = null;
}

/* ------------------------------------------------------------------ */
/* 主流程                                                             */
/* ------------------------------------------------------------------ */
let busy = false;

async function doRun() {
  if (busy) return;
  busy = true;
  runBtn.disabled = true; stopBtn.disabled = false;
  const t0 = performance.now();
  clearOutput();
  resetMetrics();
  newDecodeSession();

  try {
    if (!workerReady) await readyPromise;

    let wasm;
    try {
      wasm = (await compile(srcEditor.getValue(), false)).wasm;
    } catch (err) {
      closeDecodeSession();
      setDot('bad');
      if (err.phase) {
        metric('compile', (err.ms || 0) + ' ms', 'err');
        metric('exit', err.exitCode === undefined ? '—' : err.exitCode, 'err');
        say(`${err.phase === 'compile' ? '编译' : '链接'}失败`, 'err');
      } else if (err.jsError) {
        metric('compile', '异常', 'err');
        say('编译器内部错误', 'err');
        outEl.value += '\n' + err.jsError + '\n';
      } else {
        say('编译被中断', 'warn');
      }
      return;
    }

    const compileMs = Math.round(performance.now() - t0);
    metric('compile', compileMs + ' ms', 'ok');
    say(`编译完成（产物 ${(wasm.byteLength / 1024).toFixed(1)} KB），运行中…`);

    const timeoutMs = Math.max(200, parseInt($('timeout').value, 10) || 5000);
    const r = await runProgram(wasm, stdinEl.value, timeoutMs);
    closeDecodeSession();

    if (r.aborted) { say('已停止', 'warn'); return; }
    if (r.killed) {
      setDot('bad');
      metric('run', '> ' + timeoutMs + ' ms', 'warn');
      metric('exit', 'TLE', 'warn');
      say('运行超时，已终止该 wasm 实例', 'warn');
      outEl.value += `\n[已终止] 运行超过 ${timeoutMs} ms\n`;
    } else {
      setDot(r.code === 0 ? 'ready' : 'bad');
      metric('exit', r.code, r.code === 0 ? 'ok' : 'err');
      metric('run', r.ms + ' ms', r.code === 0 ? '' : 'err');
      if (r.memoryBytes) metric('mem', (r.memoryBytes / 1048576).toFixed(1) + ' MB');
      say(r.note ? '运行出错：' + r.note : `正常结束（产物 ${(wasm.byteLength / 1024).toFixed(1)} KB）`,
          r.code === 0 ? 'ok' : 'err');
    }
    outEl.scrollTop = outEl.scrollHeight;
  } finally {
    clearWatchdog();
    busy = false;
    runBtn.disabled = false;
    stopBtn.disabled = true;
    updateSrcLen();
  }
}

function stopAll() {
  dbgStopRun();                       /* terminate 之后必须把等待中的 run 结掉，
                                         否则 await 永远不返回，busy 卡住 */
  if (compileResolve) { compileReject({ aborted: true }); }
  closeDecodeSession();
  if (dbg.active) dbgQuit();
  setDot('busy');
  say('已停止', 'warn');
}

/* ------------------------------------------------------------------ */
/* 单步调试：插桩构建 + SharedArrayBuffer 握手                          */
/*                                                                    */
/* 编译侧（wasmclang.js 的 compileForDebug）在 LLVM IR 的每个源码行边界 */
/* 插一句 call void @__pg_trace(i32 行号)，链接时 --allow-undefined，    */
/* 于是运行模块多了一个 env.__pg_trace 导入 —— run.worker 里那个函数    */
/* 就是断点/单步/降速的全部实现处。行号通过 SAB 传回来，主线程只读，     */
/* 不用每行发一次 postMessage。                                        */
/* ------------------------------------------------------------------ */
const Range = ace.require('ace/range').Range;

const REASON_TEXT = {
  [DBG.REASON.BP]: '命中断点',
  [DBG.REASON.STEP]: '单步',
  [DBG.REASON.PAUSE]: '被暂停',
};

const dbg = {
  cb: null, ctl: null, bp: null,
  lines: null,
  vars: null, lineVars: null,     /* instrumentIR 给的变量表 / 每行快照名单 */
  marker: null, markerRow: -1, markerCls: '',
  timer: 0, lastLine: -1, lastParked: null,
  active: false,
  /* 热力背景：次数在 worker 侧的 heat 表里，这里只缓存「画成第几档」，
     避免每个 tick 都把同一档的 marker 删了重建。 */
  heatMarks: new Map(), heatLv: new Map(), heatN: new Map(),
  heatRows: null, heatMax: { n: 0, line: 0 }, heatTick: 0,
  /* 用户程序的线性内存。调试构建链的是共享内存，运行 Worker 会把它的
     SharedArrayBuffer 递过来（grow 之后会换一块新的，所以每次收都重建视图），
     数组展开和观察窗的表达式就按地址从这里读。 */
  guest: null, gdv: null,
};

function setGuestMemory(sab) {
  dbg.guest = sab || null;
  dbg.gdv = sab ? new DataView(sab) : null;
}

function dbgSupported() { return typeof SharedArrayBuffer !== 'undefined'; }

/* 拿不到 SharedArrayBuffer 时，把到底缺哪一层说清楚。链条是：
   安全上下文 → COOP/COEP → crossOriginIsolated → SAB。
   最容易说错的是最后一步：https 到位、头没到位的时候，Firefox 和 Safari 直接
   不发 SAB 这个对象，此时 typeof SharedArrayBuffer === 'undefined' 看着像
   「浏览器太旧」，其实跟版本一点关系没有；Chrome 系反过来，非隔离上下文里照样
   给 SAB，但 Atomics.wait 会被拒，调试一样停不住。所以判因先看
   crossOriginIsolated，再看 SAB 在不在，别把缺响应头报成缺浏览器。 */
function sabMissing() {
  const hasSAB = typeof SharedArrayBuffer !== 'undefined';
  if (hasSAB && self.crossOriginIsolated) return '';
  if (!self.isSecureContext)
    return `当前不是安全上下文（${location.protocol}//${location.host}）：` +
      'SharedArrayBuffer 只在 https、或 http://localhost / 127.0.0.1 下才存在，' +
      '光加 COOP/COEP 响应头没用，先把站点切到 https（或本地用 serve.py 打开）';
  if (!self.crossOriginIsolated)
    return '站点已经是 https，但页面没拿到跨源隔离：文档响应里缺 ' +
      'Cross-Origin-Opener-Policy: same-origin 或 Cross-Origin-Embedder-Policy: require-corp。' +
      (hasSAB
        ? '这个浏览器在非隔离上下文里仍然给了 SharedArrayBuffer，但 Atomics.wait 会被拒绝，调试照样停不住。'
        : '这个浏览器在非隔离上下文里不提供 SharedArrayBuffer，所以看着像「没有这个对象」，跟版本新旧无关。') +
      'nginx 有两个坑：add_header 不继承（某个 location 一旦自己写了 add_header，' +
      '上层那两个头就不再落到这个响应上，要么每个 location 重复写，要么 include 一个片段）；' +
      '要带 always，改完还得硬刷新，旧的文档响应有缓存。' +
      '如果这个页面是被 iframe 嵌在别的站点里用的，父页面也得带同样两个头，祖先链上断一环就不隔离。' +
      `自查：控制台看 self.isSecureContext 和 self.crossOriginIsolated（当前分别是 ${self.isSecureContext} 和 ${self.crossOriginIsolated}），` +
      '或者 curl -I 这个页面，看响应头里有没有那两行';
  return '跨源隔离已经生效，但这个浏览器里没有 SharedArrayBuffer：多半是企业策略或隐私设置把它关掉了';
}

function dbgCmd(mode) {
  if (!dbg.ctl) return;
  hideVarTip();
  Atomics.store(dbg.ctl, DBG.S.MODE, mode);
  /* 先改 STATE 再 notify：worker 可能还卡在 wait 上；也有一种时序是它刚判完
     循环条件还没进 wait，那时 wait 会因为期望值不符立刻返回。 */
  Atomics.store(dbg.ctl, DBG.S.STATE, DBG.STATE.GO);
  Atomics.notify(dbg.ctl, DBG.S.STATE);
}

function dbgPause() {
  if (dbg.ctl) Atomics.store(dbg.ctl, DBG.S.MODE, DBG.MODE.PAUSE);
}

/* --- 断点：交给 Ace 的 session 断点表画装订线圆点，行号同步进 SAB --- */
const BP_CLS = 'pgdbp';
const bpTable = () => srcEditor.session.getBreakpoints();
const bpRows = () => Object.keys(bpTable()).map(Number);

function toggleBreakpoint(row) {
  const sess = srcEditor.session;
  if (bpTable()[row]) sess.clearBreakpoint(row);
  else sess.setBreakpoint(row, BP_CLS);
  syncBpTable();
}
function clearAllBreakpoints() {
  srcEditor.session.clearBreakpoints();
  syncBpTable();
}
function syncBpTable() {
  if (!dbg.bp) return;
  dbg.bp.fill(0);
  for (const row of bpRows()) {
    const line = row + 1;
    if (line >= 0 && line <= DBG.MAX_LINE) dbg.bp[line] = 1;
  }
}

/* --- 当前执行行的画线 --- */
const GUTTER_CLS = ['pgcur', 'pgpark'];
function dbgGutterMark(line, cls) {
  const cells = srcEditor.container.querySelectorAll('.ace_gutter-cell');
  for (const c of cells) {
    if (c.classList.contains('pgcur') || c.classList.contains('pgpark')) c.classList.remove(...GUTTER_CLS);
  }
  if (line <= 0) return;
  /* 装订线一格一行，按行号文本找；比从 renderer 内部缓存里摸 cell 稳。 */
  for (const c of cells) if (c.textContent.trim() === String(line)) c.classList.add(cls);
}

/* Ace 的 marker 层要等渲染循环（requestAnimationFrame）才画。切到后台标签页时
   rAF 被暂停，marker 就停在旧画面上，所以这里补一次同步刷新；前台时它自己会画，
   多刷一次只是把同一个 div 的样式重写一遍，没有副作用。 */
function dbgSyncMarkers() {
  const r = srcEditor.renderer;
  try {
    r.updateBackMarkers();
    const mb = r.$markerBack;
    if (mb && mb.config) mb.update(mb.config);
  } catch (e) { /* 拿不到内部层就算了，marker 还是会在下一帧画出来 */ }
}

function dbgClearMarkerDivs() {
  const ds = srcEditor.container.querySelectorAll('.ace_marker-layer .dbgcur, .ace_marker-layer .dbgparked');
  for (const d of ds) d.remove();
}

function dbgMarkLine(line, parked) {
  const sess = srcEditor.session;
  const row = line - 1;
  const cls = parked ? 'dbgparked' : 'dbgcur';
  if (line <= 0 || row >= sess.getLength()) {
    if (dbg.marker !== null) { sess.removeMarker(dbg.marker); dbg.marker = null; dbg.markerRow = -1; }
    dbgGutterMark(0, '');
    dbgSyncMarkers(); dbgClearMarkerDivs();
    return;
  }
  if (dbg.marker !== null && dbg.markerRow === row && dbg.markerCls === cls) return;
  if (dbg.marker !== null) { sess.removeMarker(dbg.marker); dbg.marker = null; }
  /* screenLine 而不是 fullLine：前者铺满可视宽度，短行/深缩进也一眼看得到 */
  dbg.marker = sess.addMarker(new Range(row, 0, row, 1), cls, 'screenLine', false);
  dbg.markerRow = row;
  dbg.markerCls = cls;
  dbgGutterMark(line, parked ? 'pgpark' : 'pgcur');
  dbgSyncMarkers();
}

/* ------------------------------------------------------------------ */
/* 每行执行次数 → 热力背景                                              */
/*                                                                    */
/* 计数在 worker 侧（共享内存的 heat[行号]，见 dbgproto.js），不是主线程 */
/* 攒的：dbgTick 50 ms 才读一次当前行，全速档两次轮询之间早就跨过几千行， */
/* 采样数出来的是「这行被看见过几次」，跟真正的执行次数差着好几个数量级。 */
/* 深浅按 log2 分档、第 9 档封顶，是因为冒泡内层动辄上万次：线性映射的   */
/* 话除了最里面那两行全是纯红，外层循环和只做一次的初始化行分不出层次；   */
/* 取对数后 1 次、2~3、4~7、…、≥256 各占一档，红度上限锁在不吃掉字的     */
/* 那一档（.heat9 的 alpha 见 index.html）。                            */
/* ------------------------------------------------------------------ */
const HEAT_LEVELS = 9;
const HEAT_SEL = Array.from({ length: HEAT_LEVELS },
  (_, i) => `.ace_marker-layer .heat${i + 1}`).join(', ');

/* 次数 → 档次：1→1，2~3→2，4~7→3，…，≥256→9（封顶） */
function heatBucket(n) {
  let b = 1;
  while (b < HEAT_LEVELS && n >= (1 << b)) b++;
  return b;
}

/* 会话结束后给状态栏补一句：热力层还在编辑器上，顺手把最热的那行报出来。 */
function heatSummary() {
  if (!dbg.heatMarks.size) return '';
  return ` · 热力 ${dbg.heatMarks.size} 行，最热第 ${dbg.heatMax.line} 行 × ${dbg.heatMax.n.toLocaleString('en-US')} 次`;
}

function updateHeatBar() {
  const bar = $('heatbar');
  if (!bar) return;
  if (!dbg.heatMarks.size) { bar.classList.remove('on'); return; }
  bar.classList.add('on');
  $('heatinfo').textContent =
    `已标 ${dbg.heatMarks.size} 行，最热第 ${dbg.heatMax.line} 行 × ${dbg.heatMax.n.toLocaleString('en-US')} 次`;
}

/* 把 heat[] 里的次数刷成行背景。只动「档次变了」的那几行：addMarker/removeMarker
   会让 Ace 重画整个 marker 层，每个 tick 全量重建的话画面会跟着抖。 */
function paintHeat() {
  const heat = dbg.cb && dbg.cb.heat;
  if (!heat || !dbg.heatRows) return;
  const sess = srcEditor.session;
  const rows = sess.getLength();
  let changed = false;
  for (const line of dbg.heatRows) {
    if (line < 1 || line > DBG.MAX_LINE) continue;
    const n = heat[line];
    if (n > dbg.heatMax.n) dbg.heatMax = { n: n, line: line };
    if (!n) continue;
    const row = line - 1;
    if (row >= rows) continue;
    /* 次数每次都存（悬停框要报准确数字），marker 只在档次跨档时才重画 */
    if (dbg.heatN.get(row) !== n) dbg.heatN.set(row, n);
    const b = heatBucket(n);
    if (dbg.heatLv.get(row) === b) continue;
    const old = dbg.heatMarks.get(row);
    if (old) sess.removeMarker(old);
    dbg.heatMarks.set(row, sess.addMarker(new Range(row, 0, row, 1), 'heat' + b, 'screenLine', false));
    dbg.heatLv.set(row, b);
    changed = true;
  }
  if (changed) dbgSyncMarkers();
  /* 状态条每次都刷：heatMax 会在一档之内继续往上走（128~255 都算第 8 档），
     只跨档才刷的话「最热 ×N 次」会停在旧数字上。 */
  updateHeatBar();
}

/* 清掉热力层：换源码、重开一次调试会话，或者手动按「清除」。
   会话结束时不调它 —— 保留最终的红色分布正是这个功能的目的。 */
function clearHeat() {
  const sess = srcEditor.session;
  for (const m of dbg.heatMarks.values()) sess.removeMarker(m);
  dbg.heatMarks.clear(); dbg.heatLv.clear(); dbg.heatN.clear();
  dbg.heatMax = { n: 0, line: 0 };
  hideVarTip();     /* 悬停框里可能正挂着某一行的次数，层都撤了就不能再留着 */
  dbgSyncMarkers();
  const ds = srcEditor.container.querySelectorAll(HEAT_SEL);
  for (const d of ds) d.remove();
  updateHeatBar();
}

/* 行号对应的是编译进去的那份源码；改一个字热力层就不再可信了，直接撤掉。
   （会话中编辑器是只读的，所以这里不会跟插桩过程抢着改 marker。） */
srcEditor.session.on('change', () => { if (dbg.heatMarks.size) clearHeat(); });

function dbgTick() {
  if (!dbg.ctl) return;
  const c = dbg.ctl;
  const line = c[DBG.S.LINE];
  const parked = Atomics.load(c, DBG.S.STATE) === DBG.STATE.PARK;
  const hits = c[DBG.S.EVENTS];
  if (line !== dbg.lastLine || parked !== dbg.lastParked) {
    dbg.lastLine = line;
    dbg.lastParked = parked;
    dbgMarkLine(line, parked);
    bgmNote(line);      /* 行号变了才弹一声，个位决定音高（见 BGM 一节） */
    /* 跟着执行行走：
       停住时 gotoLine —— 光标也一起过去（Ace 的 gotoLine 自带居中），这样停下行
         直接悬停变量名就能看值；
       跑动时只有它跑出视野才滚，而且只滚不动光标，免得每行都拽一下画面、把人
         正在看的那段顶走。
       两个 API 都挂在 Editor 上而不是 renderer 上：isRowVisible(row) 内部读
       editor.getFirstVisibleRow()/getLastVisibleRow()；scrollToLine 收的是 0 基
       行号（它拿 row 直接喂给 $cursorLayer.getPixelPosition），所以这里传 line-1。 */
    if (line > 0) {
      if (parked) srcEditor.gotoLine(line, 0, false);
      else if (!srcEditor.isRowVisible(line - 1)) srcEditor.scrollToLine(line - 1, true, false);
    }
  }
  dbgState.textContent = parked
    ? `停在第 ${line} 行（${REASON_TEXT[c[DBG.S.REASON]] || '已停'}）· 行桩触发 ${hits.toLocaleString('en-US')} 次`
    : `运行中 · 第 ${line} 行 · 行桩触发 ${hits.toLocaleString('en-US')} 次`;
  if (!parked) hideVarTip();
  /* 热力背景：跑动时 200 ms 刷一次就够（看的是趋势，不是逐帧动画）；停住时每趟
     都刷，手工单步绕一圈能看着当前行一档一档变红。没档次变化时 paintHeat 自己会
     提前返回，不碰 marker 层。 */
  if (parked) paintHeat();
  else if (++dbg.heatTick >= 4) { dbg.heatTick = 0; paintHeat(); }
  /* 观察窗每趟都刷：它报的就是 val/arr 里的当前快照，代价只有十几行 textContent，
     而「跟着单步一起跳」正是这个面板存在的意义。 */
  refreshWatch();
}

/* ------------------------------------------------------------------ */
/* 停行时悬停看变量值                                                  */
/*                                                                    */
/* 变量表和「每行快照了哪些变量」来自插桩（compile.worker 随产物一起    */
/* 送回来），值本身在共享内存的 val 里，wr 标记这个槽写过没有。         */
/* 只在停住的时候读，读到的一定是静止数据。                            */
/* ------------------------------------------------------------------ */
const varTipEl = (() => {
  const el = document.createElement('div');
  el.className = 'vartip';
  el.style.display = 'none';
  document.body.appendChild(el);
  return el;
})();

function hideVarTip() { varTipEl.style.display = 'none'; }

/* 两个 int32 按类型描述还原成数值：数字，64 位给 BigInt。
   悬停/观察窗的格式化（fmtVar）和表达式求值器读内存用的是同一个函数，
   两条路对同一个字节的解释不可能对不上。 */
function numFromBits(t, lo, hi) {
  const u = lo >>> 0;
  const uh = hi >>> 0;
  const bits = t.bits || 32;
  if (t.kind === 'bool') return u ? 1 : 0;
  if (t.kind === 'float') {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setUint32(0, u, true);
    dv.setUint32(4, uh, true);
    return bits === 32 ? dv.getFloat32(0, true) : dv.getFloat64(0, true);
  }
  if (t.kind === 'ptr') return u;
  if (bits === 64) {
    /* 64 位用 BigInt，免得超过 2^53 掉精度 */
    return t.signed ? (BigInt(hi) << 32n) | BigInt(u) : (BigInt(uh) << 32n) | BigInt(u);
  }
  if (bits === 32) return t.signed ? (lo | 0) : u;
  const m = (1 << bits) - 1;
  let x = u & m;
  if (t.signed && (x & (1 << (bits - 1)))) x -= (1 << bits);
  return x;
}

/* 数值写成人类可读的样子：指针给地址，bool 给字面量，char 带上字符提示 */
function showVal(t, x) {
  if (t.kind === 'bool') return x ? 'true' : 'false';
  if (t.kind === 'float') {
    if (Number.isNaN(x)) return 'NaN';
    if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
    return Object.is(x, -0) ? '-0' : String(x);
  }
  if (t.kind === 'ptr') return '0x' + (x >>> 0).toString(16).padStart(8, '0');
  const s = typeof x === 'bigint' ? x.toString() : String(x);
  const bits = t.bits || 32;
  if (bits === 8 && /char/.test(t.name || t.tname || '')) {
    const n = typeof x === 'bigint' ? Number(x) : x;
    const g = n >= 32 && n < 127 ? `'${String.fromCharCode(n)}' ` : '';
    return `${g}${s}`;
  }
  return s;
}

/* 把一个快照还原成人类可读的值：kind 决定怎么解释那两个 int32 */
function fmtVar(v, lo, hi) {
  return showVal(v, numFromBits(v, lo, hi));
}

/* 停在某行时能看到的变量：名字 -> 变量描述。
   同名要挑对的那个：一个函数里写两个 for (int i...) 就是两个 alloca、两个 id，
   插桩按函数收集快照名单，所以外面那个已经出了作用域也照样挂在当前行的名单上。
   取「先出现的」会读到死变量的旧值（实测冒泡用例里停在第 25 行，输入打印那趟的
   i 停在 30，把真正的循环变量 i=0 盖掉了），所以按声明行比大：离当前行最近的那次
   声明就是当前作用域里活着的那个，把早先的同名顶掉。 */
function liveVarsAt(line) {
  const map = new Map();
  const ids = (dbg.lineVars && dbg.lineVars[String(line)]) || [];
  for (const id of ids) {
    const v = dbg.vars && dbg.vars[id];
    if (!v) continue;
    const prev = map.get(v.name);
    if (!prev || (v.line || 0) >= (prev.line || 0)) map.set(v.name, v);
  }
  return map;
}

/* 悬停/面板里一次铺开多少个元素。纯显示上限，不再是缓冲区宽度 —— 元素本来就
   在主线程直接读的那块共享内存里，想给多少个都行，只是 tooltip 会撑成一屏日志。 */
const ARR_TIP_N = 50;

/* 从用户的共享线性内存里按地址读一个元素，返回那两个小端 int32。
   字节宽度优先用类型描述自带的（插桩时算好的），回落到 DWARF 位宽推。
   越界、宽度不认识、内存还没递过来 —— 一律返回 null，由调用方说清楚原因，
   绝不猜一个数填上去。 */
function memPeek(addr, d) {
  const dv = dbg.gdv;
  if (!dv || !addr) return null;
  const b = d.bytes || (d.kind === 'ptr' ? 4 : ((d.bits || 0) >> 3));
  if (b !== 1 && b !== 2 && b !== 4 && b !== 8) return null;
  if (addr < 0 || addr + b > dv.byteLength) return null;
  let lo, hi = 0;
  if (b === 1) lo = dv.getUint8(addr);
  else if (b === 2) lo = dv.getUint16(addr, true);
  else if (b === 4) lo = dv.getUint32(addr, true);
  /* 高 32 位一定要按「有符号」取：numFromBits 的 64 位分支靠 BigInt(hi) << 32 的
     符号扩展还原负数，取成无符号的话 -1 会报成 18446744073709551615。
     （标量那条通道存的就是 Int32Array，天然带符号，所以没这个问题。） */
  else { lo = dv.getUint32(addr, true); hi = dv.getInt32(addr + 4, true); }
  return { lo: lo, hi: hi, bytes: b };
}

/* 按类型从内存里取一个值；读不到给 null（求值器拿它区分「0」和「没读着」） */
function readAt(addr, ty) {
  const p = memPeek(addr, ty);
  return p ? numFromBits(ty, p.lo, p.hi) : null;
}

/* 类型描述归一化。插桩送回来的变量记录（rec）和 rec.pt 那种 wireTy 节点形状不完全
   一样（一个用 tname/ekind，一个用 name/elem），这里统一成求值器认的那一份：
   { kind, bits, signed, name, bytes }，数组再带 elem + dims，指针再带 pt。
   bytes 是「这个类型在内存里占几个字节」，算下标偏移全靠它；拿不准就是 0，
   求值器看到 0 会明说算不了，不会闷头猜。 */
function normTy(t) {
  if (!t) return { kind: 'unknown', name: '?', bytes: 0 };
  const o = {
    kind: t.kind || 'unknown', bits: t.bits || 0, signed: !!t.signed,
    name: t.name || t.tname || '?',
    bytes: t.bytes || (t.kind === 'ptr' ? 4 : ((t.bits || 0) >> 3)),
  };
  if (o.kind === 'arr') {
    o.elem = normTy(t.elem);
    o.dims = (t.dims && t.dims.length) ? t.dims.slice() : [0];
  }
  if (o.kind === 'ptr') o.pt = normTy(t.pt);
  return o;
}

/* 变量记录 -> 类型描述。数组的元素类型优先用插桩带回来的 et（那是完整的 wireTy，
   指针元素还能继续往下剥），老构建没有 et 才用 ekind/ebits 这几个散字段拼。 */
function varTy(v) {
  if (v.kind === 'arr') {
    const e = v.et ? normTy(v.et) : normTy({
      kind: v.ekind, bits: v.ebits, signed: v.esigned, name: v.ename, bytes: v.ebytes,
    });
    return {
      kind: 'arr', name: v.tname || (e.name + '[]'), bytes: e.bytes,
      elem: e, dims: (v.adims && v.adims.length) ? v.adims.slice() : [v.acount || 0],
    };
  }
  if (v.kind === 'ptr') {
    return { kind: 'ptr', bits: 32, signed: false, name: v.tname || 'void*', bytes: 4, pt: normTy(v.pt) };
  }
  /* 标量：变量记录里的 name 是变量名，类型名在 tname 上，别让它俩串位
     （不然观察窗的类型列会显示成 `x : x = 42`）。 */
  return normTy({
    kind: v.kind, bits: v.bits, signed: v.signed, name: v.tname,
  });
}

/* ------------------------------------------------------------------ */
/* char[] 当字符串看。元素是 1 字节整数（char / unsigned char / int8_t）、 */
/* 内容又全是可显示的文字，就直接写成 "…"，不再一个一个报十进制。           */
/* 「可显示」按 UTF-8 严格解码判定：解不出合法 UTF-8，或者解出来还带着控制   */
/* 字符（\t \n \r 除外，它们写成转义，不然一行放不平），就退回逐个元素铺开 —— */
/* 报一屏乱码不如报数，所以宁可退回，不猜。                                 */
/* 第一个 0 是 C 字符串的结尾：它之后的字节（补位用的那一大片 0）不参与判定， */
/* 也不显示。整个数组都没有 0 时按定宽字段处理，全可显示就照抄。             */
/* bool 不会被误认：它的 kind 是 'bool'，不是 'int'。                       */
/* ------------------------------------------------------------------ */
const STR_WATCH_N = 64;   /* 观察窗一行铺开多少个字符 */
const STR_TIP_N = 200;    /* 悬停框铺开多少个字符 */
const STR_SCAN_MAX = 4096; /* 找结尾那个 0 最多扫多少字节：再长的数组只报「至少」 */
const utf8Strict = typeof TextDecoder !== 'undefined'
  ? new TextDecoder('utf-8', { fatal: true }) : null;

function isCharTy(t) {
  return !!t && t.kind === 'int' && (t.bytes === 1 || t.bits === 8);
}

/* 像字符串就返回带引号的那一句，不像（或内存还没递过来）返回 null。 */
function charText(addr, count, limit) {
  const dv = dbg.gdv;
  if (!dv || !utf8Strict || !addr || !count || limit <= 0) return null;
  const hi = Math.min(count, STR_SCAN_MAX);
  let end = hi;
  for (let i = 0; i < hi; ++i) {
    const p = addr + i;
    if (p < 0 || p >= dv.byteLength) return null;
    if (dv.getUint8(p) === 0) { end = i; break; }
  }
  /* TextDecoder 不吃挂在 SharedArrayBuffer 上的视图（"must not be shared"），
     所以先把这一段字节拷进一份普通内存；拷的规模由 STR_SCAN_MAX 兜住。 */
  const bytes = new Uint8Array(end);
  bytes.set(new Uint8Array(dv.buffer, addr, end));
  let s;
  try { s = utf8Strict.decode(bytes); }
  catch (e) { return null; }             /* 不是合法 UTF-8：退回逐个元素报数 */
  const body = new Array(s.length);
  for (let i = 0; i < s.length; ++i) {
    const c = s.charCodeAt(i);
    if (c === 0x09) body[i] = '\\t';
    else if (c === 0x0a) body[i] = '\\n';
    else if (c === 0x0d) body[i] = '\\r';
    else if (c < 0x20 || c === 0x7f) return null;   /* 其余控制字符：不像文字 */
    else body[i] = (c === 0x22 || c === 0x5c) ? '\\' + s[i] : s[i];
  }
  const k = Math.min(s.length, limit);
  /* 「共」还是「至少」：看见过结尾的 0（end < hi），或者整个数组都在扫描范围里
     （hi === count），长度才是确定的；只有被 STR_SCAN_MAX 截断的那一段才说不准。 */
  const tot = end < hi || hi === count ? `共 ${s.length}` : `至少 ${s.length}`;
  const more = s.length > k ? `…（${tot} 个字符，只显示前 ${k} 个）` : '';
  return `"${body.slice(0, k).join('')}"${more}`;
}

/* 一段内存里的 n 个同类型元素铺开成 { … }，超过 limit 就把总长度报出来。
   读不到的位置（越界、元素宽度不认识）给一个「·」，不猜值。
   字符数组先试字符串那条路（strLimit 是字符串档位，没给就沿用 limit）。 */
function cellsText(addr, elemTy, count, limit, strLimit) {
  if (isCharTy(elemTy)) {
    const s = charText(addr, count, strLimit === undefined ? limit : strLimit);
    if (s !== null) return s;
  }
  const n = Math.min(count, limit || count);
  const cells = new Array(n);
  for (let i = 0; i < n; ++i) {
    const x = readAt(addr + i * elemTy.bytes, elemTy);
    cells[i] = x === null ? '·' : showVal(elemTy, x);
  }
  const more = count > n ? `…（共 ${count} 个，只显示前 ${n} 个）` : '';
  return `{ ${cells.join(', ')} }${more}`;
}

/* 数组的前 limit 个元素：地址从控制块的地址表里拿（那是 __pg_addr 在每行快照时
   登记的栈槽地址，函数返回后同一个槽会被后面的调用复用 —— 和真实调试器一样），
   元素本身直接读共享内存。 */
function arrCells(v, limit, strLimit) {
  if (v.kind !== 'arr' || !v.acount) return { err: '长度未知的数组（变长数组），没法展开' };
  const cb = dbg.cb;
  const base = v.id * DBG.ARR_W;
  const addr = cb ? cb.arr[base] : 0;
  const count = (cb && cb.arr[base + 2]) || v.acount;
  if (!cb || !addr || !count) return { err: '尚无快照（这一行还没执行到它的声明）' };
  if (!dbg.gdv) return { err: '用户内存还没从运行 Worker 递过来' };
  return { text: cellsText(addr, varTy(v).elem, count, limit, strLimit) };
}

/* 数组值的一行写法；拿不到快照时把原因原话说出来 */
function arrText(v, limit, strLimit) {
  const a = arrCells(v, limit, strLimit);
  return a.err ? a.err : a.text;
}

function varTipText(name, v, line) {
  const head = `${name} : ${v.tname || '?'}`;
  if (v.kind === 'arr') return `${head} = ${arrText(v, ARR_TIP_N, STR_TIP_N)}`;
  if (v.kind === 'obj' || v.kind === 'unknown') {
    return `${head} = 结构体/数组，暂不展开`;
  }
  if (!dbg.cb || !dbg.cb.wr[v.id]) return `${head} = 尚无快照`;
  const lo = dbg.cb.val[v.id * 2];
  const hi = dbg.cb.val[v.id * 2 + 1];
  const note = v.line === line ? '（本行声明，可能还没赋值）' : '';
  return `${head} = ${fmtVar(v, lo, hi)}${note}`;
}

/* 悬浮框只有一个（.vartip）：停住时显示变量值，其余时候显示这行的执行次数。 */
function showTip(text, ev) {
  varTipEl.textContent = text;
  varTipEl.style.display = 'block';
  const w = varTipEl.offsetWidth, h = varTipEl.offsetHeight;
  varTipEl.style.left = Math.min(ev.clientX + 14, innerWidth - w - 8) + 'px';
  varTipEl.style.top = (ev.clientY + 16 + h > innerHeight ? ev.clientY - h - 8 : ev.clientY + 16) + 'px';
}

/* 没停住时悬停报这一行的执行次数：找热点的人要的正是这个数。
   取的是最后一次 paintHeat 存下的快照，会话结束后那就是终值。 */
function heatTipAt(ev) {
  if (!dbg.heatN.size) return false;
  let row = -1;
  try {
    row = srcEditor.renderer.screenToTextCoordinates(ev.clientX, ev.clientY).row;
  } catch (e) { return false; }
  const n = dbg.heatN.get(row);
  if (!n) return false;
  showTip(`第 ${row + 1} 行执行 ${n.toLocaleString('en-US')} 次（热力第 ${dbg.heatLv.get(row)}/${HEAT_LEVELS} 档）`, ev);
  return true;
}

/* 悬停查变量。注意不能用 e.target 是不是 .ace_identifier 的 span 来判断：
   Ace 的 .ace_layer 整层 pointer-events: none（它自己的 CSS 里写了，为了 Safari
   滚轮不被打断），真实鼠标事件的 target 永远是 div.ace_content，压根拿不到 span。
   所以走坐标反查：clientX/Y -> 文档行列 -> 该位置的 token。
   变量值只在「停住」时给（那时内存是静止的）；没停住就退一步报热力次数。 */
srcEditor.container.addEventListener('mousemove', (ev) => {
  if (!(dbg.active && dbg.ctl) || Atomics.load(dbg.ctl, DBG.S.STATE) !== DBG.STATE.PARK) {
    if (heatTipAt(ev)) return;
    hideVarTip();
    return;
  }
  let name = '';
  try {
    const pos = srcEditor.renderer.screenToTextCoordinates(ev.clientX, ev.clientY);
    const tok = srcEditor.session.getTokenAt(pos.row, pos.column);
    if (tok && /^(identifier|variable|property)/.test(tok.type) && /^[\w$]+$/.test(tok.value)) {
      name = tok.value;
    }
  } catch (e) { name = ''; }
  if (!name) { if (!heatTipAt(ev)) hideVarTip(); return; }
  const line = dbg.ctl[DBG.S.LINE];
  const v = liveVarsAt(line).get(name);
  if (!v) { if (!heatTipAt(ev)) hideVarTip(); return; }
  showTip(varTipText(name, v, line), ev);
});
srcEditor.container.addEventListener('mouseleave', hideVarTip);

/* ------------------------------------------------------------------ */
/* 表达式求值                                                          */
/*                                                                    */
/* 观察窗要收 a[i]、*(p+1)、a[i][j]、x/100 > 0.5 这样的式子。wasm 里那 */
/* 套 clang 没法拿来算 JS 字符串，所以这里自己写一个：词法 -> 递归下降 */
/* -> 按类型描述算地址 -> 从共享内存读值。它算出来的数不是蒙的，依据有 */
/* 两条：插桩把每个变量的 DWARF 类型（元素类型、多维数组每一维的长度、 */
/* 指针指向什么）一起带回了主线程；调试构建链的是共享内存，主线程拿着   */
/* 地址就能读到程序此刻真实的字节。                                    */
/*                                                                    */
/* 覆盖：标识符、整数字面量（含十六进制和 u/l 后缀）、字符字面量、浮点   */
/* 字面量、true/false/nullptr、下标 []（数组、多维、指针）、括号、一元  */
/* + - ! ~ * &、二元 + - * / % << >> < <= > >= == != & | ^ && || ?:、 */
/* 指针加减下标、(类型) 强转。                                         */
/* 明确不做，碰到了就直说而不是给个看着像答案的数：成员访问 . 和 ->（结 */
/* 构体字段本期不展开）、函数调用（v.size()）、字符串字面量、++/--（会  */
/* 写内存，观察窗只读）、全局变量（DWARF 的 llvm.dbg.declare 只报局部量，*/
/* 插桩表里压根没有它们）。                                            */
/*                                                                    */
/* 求值时机跟悬停一样：停住时内存是静止的，读到的一定是干净值；全速跑时 */
/* 每个 tick 也在刷，可能读到某个赋值写到一半的撕裂值 —— 这是「跟着每行 */
/* 刷新」换来的，标量通道一直如此。                                    */
/* ------------------------------------------------------------------ */

/* 表达式里说人话的错误：e.expr 标记这是「该给用户看的一句解释」，
   不是页面自己出了 bug。求值器绝不静默返回一个猜出来的数。 */
function exprErr(msg) {
  const e = new Error(msg);
  e.expr = true;
  return e;
}

const E_INT = { kind: 'int', bits: 32, signed: true, name: 'int', bytes: 4 };
const E_UINT = { kind: 'int', bits: 32, signed: false, name: 'unsigned int', bytes: 4 };
const E_SHORT = { kind: 'int', bits: 16, signed: true, name: 'short', bytes: 2 };
const E_USHORT = { kind: 'int', bits: 16, signed: false, name: 'unsigned short', bytes: 2 };
const E_LLONG = { kind: 'int', bits: 64, signed: true, name: 'long long', bytes: 8 };
const E_ULLONG = { kind: 'int', bits: 64, signed: false, name: 'unsigned long long', bytes: 8 };
const E_FLOAT = { kind: 'float', bits: 32, signed: true, name: 'float', bytes: 4 };
const E_DOUBLE = { kind: 'float', bits: 64, signed: true, name: 'double', bytes: 8 };
const E_CHR = { kind: 'int', bits: 8, signed: true, name: 'char', bytes: 1 };
const E_BOOL = { kind: 'bool', bits: 8, signed: false, name: 'bool', bytes: 1 };

/* ---- 词法 ---- */
const EX_NUM = /((?:0[xX][0-9a-fA-F]+|(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?))([uUlLfF]*)/y;
const EX_ID = /[A-Za-z_$][\w$]*/y;
const EX_OP2 = ['<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '++', '--', '->', '::'];
const EX_OP1 = '+-*/%()[],<>=!&|^~?:;.';

function tokenizeExpr(src) {
  const tk = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { ++i; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') {
          const e = src[j + 1];
          s += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e === '0' ? '\0' : (e === undefined ? '' : e);
          j += 2;
        } else { s += src[j]; ++j; }
      }
      if (j >= src.length) throw exprErr('引号没有闭合');
      if (c === '"') throw exprErr('字符串字面量不参与求值：要看内容请直接观察那个 char 数组');
      if (s.length !== 1) throw exprErr('字符字面量只支持单个字符（\'a\'），多个字符的（\'ab\'）不算');
      tk.push({ k: 'num', v: s.charCodeAt(0), ty: E_CHR, t: `'${s}'` });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      EX_NUM.lastIndex = i;
      const m = EX_NUM.exec(src);
      if (!m) throw exprErr(`这个数看不懂：${src.slice(i, i + 12)}`);
      i += m[0].length;
      tk.push(numToken(m[1], m[2].toLowerCase()));
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      EX_ID.lastIndex = i;
      const m = EX_ID.exec(src);
      tk.push({ k: 'id', v: m[0], t: m[0] });
      i += m[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (EX_OP2.indexOf(two) >= 0) { tk.push({ k: 'op', v: two, t: two }); i += 2; continue; }
    if (EX_OP1.indexOf(c) >= 0) { tk.push({ k: 'op', v: c, t: c }); ++i; continue; }
    throw exprErr(`这个字符进不了表达式：${c}`);
  }
  return tk;
}

/* 数字字面量的类型：wasm32 里 long 是 32 位、long long 才是 64 位，
   后缀按这个规则给；没后缀就按 C++ 的规则往能装下的最小类型上靠。
   十六进制（0x…）里那个 x 不能被当成指数，所以判浮点前先看是不是十六进制。 */
function numToken(text, suf) {
  const hex = /^0[xX]/.test(text);
  if (!hex && /[.eE]/.test(text)) {
    const bits = suf.indexOf('f') >= 0 ? 32 : 64;
    return {
      k: 'num', v: parseFloat(text), t: text,
      ty: { kind: 'float', bits: bits, signed: true, name: bits === 32 ? 'float' : 'double', bytes: bits / 8 },
    };
  }
  let x;
  try { x = BigInt(text); } catch (e) { throw exprErr(`这个数看不懂：${text}`); }
  const u = suf.indexOf('u') >= 0;
  let bits = suf.indexOf('ll') >= 0 ? 64 : 32;
  let signed = !u;
  if (!suf) {
    if (x > 0x7fffffffn && x <= 0xffffffffn) signed = false;
    if (x > 0xffffffffn) bits = 64;
  } else if (u && bits === 32 && x > 0xffffffffn) bits = 64;
  const name = `${signed ? '' : 'unsigned '}${bits === 64 ? 'long long' : 'int'}`;
  return {
    k: 'num', v: bits === 64 ? x : Number(x), t: text,
    ty: { kind: 'int', bits: bits, signed: signed, name: name, bytes: bits / 8 },
  };
}

/* ---- 语法：递归下降，一层一个优先级 ---- */
const BIN_LEVELS = [
  ['||'], ['&&'], ['|'], ['^'], ['&'],
  ['==', '!='], ['<', '<=', '>', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%'],
];
const CAST_WORDS = { int: 1, long: 1, short: 1, char: 1, signed: 1, unsigned: 1, float: 1, double: 1, bool: 1, _bool: 1 };
const CAST_TY = {
  'bool': E_BOOL,
  '_bool': { kind: 'bool', bits: 8, signed: false, name: '_Bool', bytes: 1 },
  'char': E_CHR,
  'signed char': { kind: 'int', bits: 8, signed: true, name: 'signed char', bytes: 1 },
  'unsigned char': { kind: 'int', bits: 8, signed: false, name: 'unsigned char', bytes: 1 },
  'short': E_SHORT, 'short int': E_SHORT, 'signed short': E_SHORT, 'signed short int': E_SHORT,
  'unsigned short': E_USHORT, 'unsigned short int': E_USHORT,
  'int': E_INT, 'signed int': E_INT, 'signed': E_INT,
  'unsigned int': E_UINT, 'unsigned': E_UINT,
  /* wasm32：long 和 int 同宽，unsigned long 同理 */
  'long': E_INT, 'long int': E_INT, 'signed long': E_INT, 'signed long int': E_INT,
  'unsigned long': E_UINT, 'unsigned long int': E_UINT,
  'long long': E_LLONG, 'long long int': E_LLONG, 'signed long long': E_LLONG,
  'unsigned long long': E_ULLONG,
  'float': E_FLOAT, 'double': E_DOUBLE,
};

function isOpAt(p, ops) {
  const t = p.tk[p.i];
  return !!t && t.k === 'op' && ops.indexOf(t.v) >= 0;
}
function expectOp(p, o) {
  if (!isOpAt(p, [o])) throw exprErr(`表达式里这里该有 ${o}`);
  p.i++;
}

function parseLevel(p, lv) {
  if (lv >= BIN_LEVELS.length) return parseUnary(p);
  let l = parseLevel(p, lv + 1);
  while (isOpAt(p, BIN_LEVELS[lv])) {
    const o = p.tk[p.i++].v;
    l = { k: 'bin', o: o, l: l, r: parseLevel(p, lv + 1) };
  }
  return l;
}

function parseTernary(p) {
  const c = parseLevel(p, 0);
  if (!isOpAt(p, ['?'])) return c;
  p.i++;
  const a = parseTernary(p);
  expectOp(p, ':');
  return { k: 'tern', c: c, a: a, b: parseTernary(p) };
}

function parseUnary(p) {
  if (isOpAt(p, ['-', '+', '!', '~', '*', '&'])) {
    const o = p.tk[p.i++].v;
    return { k: 'un', o: o, a: parseUnary(p) };
  }
  if (isOpAt(p, ['++', '--'])) throw exprErr('++/-- 要写内存，观察窗只读不写，别放进表达式');
  if (isOpAt(p, ['(']) && looksLikeCast(p)) return parseCast(p);
  return parsePostfix(p);
}

/* (int) x 和 (a + b) 都以 ( 开头，靠括号里是不是清一色的类型关键字区分 */
function looksLikeCast(p) {
  let i = p.i + 1;
  let n = 0;
  while (p.tk[i] && p.tk[i].k === 'id' && CAST_WORDS[p.tk[i].v.toLowerCase()]) { ++n; i += 1; }
  if (!n) return false;
  if (!(p.tk[i] && p.tk[i].k === 'op' && p.tk[i].v === ')')) return false;
  const key = p.tk.slice(p.i + 1, p.i + 1 + n).map((t) => t.v.toLowerCase()).join(' ');
  return !!CAST_TY[key];
}

function parseCast(p) {
  p.i++;
  const words = [];
  while (p.tk[p.i] && p.tk[p.i].k === 'id' && CAST_WORDS[p.tk[p.i].v.toLowerCase()]) {
    words.push(p.tk[p.i++].v.toLowerCase());
  }
  expectOp(p, ')');
  const ty = CAST_TY[words.join(' ')];
  return { k: 'cast', ty: ty, a: parseUnary(p) };
}

function parsePostfix(p) {
  let a = parsePrimary(p);
  for (;;) {
    if (isOpAt(p, ['['])) {
      p.i++;
      const i = parseTernary(p);
      expectOp(p, ']');
      a = { k: 'idx', a: a, i: i };
      continue;
    }
    if (isOpAt(p, ['.', '->'])) throw exprErr('成员访问（. 和 ->）不在本期范围：结构体/类的字段还读不到');
    if (isOpAt(p, ['('])) throw exprErr('函数调用不参与求值：观察窗只读内存，不执行代码（v.size() 这类得先把它存进一个变量再观察）');
    if (isOpAt(p, ['++', '--'])) throw exprErr('++/-- 要写内存，观察窗只读不写，别放进表达式');
    return a;
  }
}

function parsePrimary(p) {
  const t = p.tk[p.i];
  if (!t) throw exprErr('表达式不完整，后面还缺东西');
  if (t.k === 'num') { p.i++; return { k: 'lit', ty: t.ty, v: t.v }; }
  if (t.k === 'id') {
    p.i++;
    const low = t.v.toLowerCase();
    if (t.v === 'true' || t.v === 'false') {
      return { k: 'lit', ty: CAST_TY.bool, v: t.v === 'true' ? 1 : 0 };
    }
    if (t.v === 'nullptr' || t.v === 'NULL') {
      return { k: 'lit', ty: { kind: 'ptr', bits: 32, signed: false, name: 'nullptr', bytes: 4, pt: { kind: 'unknown', name: 'void', bytes: 0 } }, v: 0 };
    }
    if (low === 'sizeof') throw exprErr('sizeof 不参与求值（它是编译期就算好的）');
    return { k: 'id', n: t.v };
  }
  if (t.k === 'op' && t.v === '(') {
    p.i++;
    const e = parseTernary(p);
    expectOp(p, ')');
    return e;
  }
  if (t.k === 'op' && (t.v === ';' || t.v === ',')) throw exprErr('观察窗一次只算一个表达式，别写分号或逗号');
  throw exprErr(`这里该有一个数、变量名或 ( ，看到的是 ${t.t}`);
}

function parseExprSrc(src) {
  const p = { tk: tokenizeExpr(src), i: 0 };
  if (!p.tk.length) throw exprErr('表达式是空的');
  const e = parseTernary(p);
  if (p.i < p.tk.length) throw exprErr(`${p.tk[p.i].t} 这里连不上下文`);
  return e;
}

/* 语法很便宜，但每个 tick 都要重算 24 行，还是缓存一下。
   键是表达式文本，值要么是 AST 要么是「这句式子哪儿不对」。 */
const astCache = new Map();
function parseWatch(src) {
  const hit = astCache.get(src);
  if (hit) return hit;
  let r;
  try { r = { ast: parseExprSrc(src) }; }
  catch (e) { r = { err: e.expr ? e.message : `解析失败：${e.message}` }; }
  if (astCache.size > 128) astCache.clear();
  astCache.set(src, r);
  return r;
}

/* ---- 语义 ---- */
const isPtr = (t) => !!t && t.kind === 'ptr';
const isFlt = (t) => !!t && t.kind === 'float';
const isInt = (t) => !!t && (t.kind === 'int' || t.kind === 'bool');

/* 参与算术时 bool / char 一律先升到整数（C++ 的整型提升），位宽留给类型判断 */
function numTy(t) {
  if (t.kind === 'bool') return { kind: 'int', bits: 8, signed: true, name: t.name, bytes: 1 };
  return t;
}

/* 常规算术转换：有浮点就升到最宽的那个浮点，否则整数按最宽位走；
   32 位以下统一升到 int（wasm32 上 int 是 32 位），一方无符号结果就无符号。 */
function arithTy(a, b) {
  a = numTy(a); b = numTy(b);
  if (isFlt(a) || isFlt(b)) {
    const bits = Math.max(isFlt(a) ? a.bits : 0, isFlt(b) ? b.bits : 0) || 64;
    return { kind: 'float', bits: bits, signed: true, name: bits === 64 ? 'double' : 'float', bytes: bits / 8 };
  }
  const bits = Math.max(32, a.bits || 32, b.bits || 32);
  const signed = a.signed !== false && b.signed !== false;
  return {
    kind: 'int', bits: bits, signed: signed, bytes: bits / 8,
    name: `${signed ? '' : 'unsigned '}${bits === 64 ? 'long long' : 'int'}`,
  };
}

/* 值收成目标类型：整数走 BigInt 截断，浮点原样，bool 只看非零 */
function toTyBig(t, x) {
  if (typeof x !== 'bigint') x = BigInt(Math.trunc(Number(x)));
  const bits = BigInt(t.bits || 32);
  x &= (1n << bits) - 1n;
  if (t.signed && ((x >> (bits - 1n)) & 1n) === 1n) x -= (1n << bits);
  return x;
}
function intRes(t, x) {
  return { ty: t, val: t.bits >= 64 ? x : Number(x) };
}
const TRUE_RES = { ty: E_INT, val: 1 };
const FALSE_RES = { ty: E_INT, val: 0 };
function cmpRes(ok) { return ok ? TRUE_RES : FALSE_RES; }

function truthy(r) {
  const v = r.val;
  if (typeof v === 'bigint') return v !== 0n;
  return v !== 0;
}

/* 结果值写成一行。数组（a[i] 落在多维数组上剩下的那一行也是数组）铺开给
   limit 个，字符数组走字符串那条路（strLimit），其它类型走 showVal ——
   和悬停完全同一套格式化。 */
function showRes(r, limit, strLimit) {
  if (r.ty.kind === 'arr') {
    if (r.addr === undefined) throw exprErr('这个数组值没有地址，读不出元素');
    const n = dimProd(r.ty.dims);
    return { ty: r.ty.name, text: cellsText(r.addr, r.ty.elem, n, limit, strLimit) };
  }
  if (r.addr !== undefined) {
    const x = readAt(r.addr, r.ty);
    if (x === null) throw exprErr(`地址 0x${(r.addr >>> 0).toString(16)} 上读不出 ${r.ty.name}：越界，或者这个类型的宽度还不认`);
    return { ty: r.ty.name, text: showVal(r.ty, x) };
  }
  return { ty: r.ty.name, text: showVal(r.ty, r.val) };
}

function dimProd(dims) {
  let p = 1;
  for (const d of dims || []) p *= (d > 0 ? d : 0);
  return p;
}

/* 数组出现在要值的地方就是首元素地址（衰减）；带地址的标量按地址读；
   已经有值的原样返回。 */
function rvalue(r) {
  if (r.val !== undefined) return r;         /* 标量通道已经把这个变量的此刻值报给我们了 */
  if (r.ty.kind === 'arr') {
    const e = r.ty.elem;
    return {
      ty: { kind: 'ptr', bits: 32, signed: false, name: (e.name || '?') + '*', bytes: 4, pt: e },
      val: r.addr >>> 0,
    };
  }
  const x = readAt(r.addr, r.ty);
  if (x === null) throw exprErr(`地址 0x${(r.addr >>> 0).toString(16)} 上读不出 ${r.ty.name}：越界，或者这个类型的宽度还不认`);
  return { ty: r.ty, val: x };
}

/* 二元运算里数组先衰减成指针（a + 1 是加一个元素，不是把首地址当成数加） */
function decay(r) {
  return r.ty.kind === 'arr' ? rvalue(r) : r;
}

/* 变量名 -> 左值/右值。值走标量通道（val 槽），数组和「不在当前行名单里」的
   变量走地址通道（arr 槽），指针的「指向什么」从插桩带回来的 pt 链上取。
   ctx.stale 是一句话，不是个布尔：名单外按地址读的是这一行的真值，只是不属于
   当前作用域；只有退回标量通道那份缓存的才是旧值。 */
function varValue(name, ctx) {
  const hit = pickVar(name, ctx.line);
  if (!hit) throw exprErr(`没有 ${name}：本次构建的变量表里找不到它（全局变量不在表里，别的函数里的同名变量也不算）`);
  const v = hit.v;
  const ty = varTy(v);
  if (v.kind === 'obj' || v.kind === 'unknown') throw exprErr(`${name} 的类型是 ${ty.name}，结构体/类/未知类型本期读不了`);
  const cb = ctx.cb;
  if (!cb) throw exprErr(`${name} 还没有快照：会话没开始`);
  const snap = () => ({
    ty: ty, val: numFromBits(ty, cb.val[v.id * 2], cb.val[v.id * 2 + 1]), addr: cb.arr[v.id * DBG.ARR_W] | 0,
  });
  /* 一句提示只报第一个数不上名字的表达式，多个变量在外名单里时说不清是哪个 */
  const offList = () => { if (!ctx.stale) ctx.stale = `（${name} 不在当前行的快照名单里，按登记的地址读）`; };
  const base = v.id * DBG.ARR_W;
  const addr = cb.arr[base] | 0;
  if (v.kind === 'arr') {
    if (!addr || !cb.arr[base + 2]) throw exprErr(`${name} 当前行没有快照（这一行还没执行到它的声明）`);
    if (!hit.live) offList();
    return { ty: ty, addr: addr };
  }
  if (hit.live && cb.wr[v.id]) return snap();
  /* 没进这一行的快照名单，但插桩登记过它的栈槽地址 —— 直接读内存，
     拿到的还是这一行的真值（函数返回后同一个槽会被复用，这点和真实调试器一样）。 */
  if (addr) {
    if (!hit.live) offList();
    return { ty: ty, addr: addr };
  }
  /* 标量通道写过它（值本来就在 SSA 寄存器里的形参没地址，只有这一条路） */
  if (cb.wr[v.id]) {
    if (!ctx.stale) ctx.stale = `（${name} 当前行没快照到，是旧值）`;
    return snap();
  }
  throw exprErr(`${name} 当前行没有快照（这一行还没执行到它的声明）`);
}

/* X[i]：数组按 dims 走（多维数组一步跨的是「剩下那些维的乘积」个元素），
   指针按被指向类型的大小走。base 不能先衰减成指针，否则多维就退化成一步 4 字节。 */
function evalIdx(base, idxNode, ctx) {
  const k = rvalue(evalNode(idxNode, ctx));
  if (!isInt(k.ty)) throw exprErr('下标得是整数');
  const kn = typeof k.val === 'bigint' ? Number(k.val) : k.val;
  if (!Number.isInteger(kn)) throw exprErr('下标得是整数');
  if (base.ty.kind === 'arr') {
    const dims = base.ty.dims || [];
    if (!dims.length || dims[0] <= 0) throw exprErr(`${base.ty.name} 的每一维长度未知，算不了下标`);
    const stride = dimProd(dims.slice(1)) * base.ty.elem.bytes;
    if (!stride) throw exprErr(`${base.ty.name} 的元素宽度不认识，算不了下标`);
    const rest = dims.slice(1);
    const ty = rest.length
      ? { kind: 'arr', name: base.ty.elem.name + rest.map((d) => `[${d}]`).join(''), elem: base.ty.elem, dims: rest, bytes: base.ty.elem.bytes }
      : base.ty.elem;
    return { ty: ty, addr: base.addr + kn * stride };
  }
  if (isPtr(base.ty)) {
    const bytes = ptrStride(base.ty);
    if (!bytes) throw exprErr(`${base.ty.name} 指向的类型不知道宽度（void* / 结构体指针），算不了下标`);
    return { ty: base.ty.pt, addr: ((rvalue(base).val >>> 0) + kn * bytes) >>> 0 };
  }
  throw exprErr(`${base.ty.name} 不能取下标：[] 只用在数组和指针上`);
}

function evalUn(n, ctx) {
  if (n.o === '*') {
    const r = rvalue(evalNode(n.a, ctx));
    if (!isPtr(r.ty)) throw exprErr(`* 只能解引用指针，这里是 ${r.ty.name}`);
    if (!r.ty.pt || !r.ty.pt.bytes) throw exprErr(`${r.ty.name} 指向的类型不知道宽度（void* / 结构体指针），读不出值`);
    return { ty: r.ty.pt, addr: r.val >>> 0 };
  }
  if (n.o === '&') {
    const r = evalNode(n.a, ctx);
    if (r.addr === undefined) throw exprErr('& 只能取变量、数组元素这类“住在内存里”的东西的地址，临时算出来的值没有地址');
    return ptrRes(r.ty, r.addr);
  }
  const r = rvalue(evalNode(n.a, ctx));
  const x = r.val;
  if (n.o === '!') return cmpRes(!truthy(r));
  if (r.ty.kind === 'bool') {
    /* 一元 + - 作用在 bool 上按整型提升算 */
    const b = numTy(r.ty);
    return evalUnInt(n.o, toTyBig(b, x), b);
  }
  if (isFlt(r.ty)) {
    if (n.o === '-') return { ty: r.ty, val: -x };
    if (n.o === '+') return { ty: r.ty, val: x };
    throw exprErr(`${n.o} 用不了在 ${r.ty.name} 上`);
  }
  if (isInt(r.ty)) return evalUnInt(n.o, toTyBig(r.ty, x), r.ty);
  throw exprErr(`${n.o} 用不了在 ${r.ty.name} 上`);
}

function ptrRes(t, addr) {
  return {
    ty: { kind: 'ptr', bits: 32, signed: false, name: (t.name || '?') + '*', bytes: 4, pt: t },
    val: addr >>> 0,
  };
}

function evalUnInt(o, x, ty) {
  if (o === '-') return intRes(ty, toTyBig(ty, -x));
  if (o === '+') return intRes(ty, x);
  if (o === '~') return intRes(ty, toTyBig(ty, ~x));
  if (o === '!') return cmpRes(x === 0n);
  throw exprErr(`${o} 用不了在 ${ty.name} 上`);
}

function evalBin(n, ctx) {
  const o = n.o;
  if (o === '&&') return truthy(rvalue(evalNode(n.l, ctx))) ? cmpRes(truthy(rvalue(evalNode(n.r, ctx)))) : FALSE_RES;
  if (o === '||') return truthy(rvalue(evalNode(n.l, ctx))) ? TRUE_RES : cmpRes(truthy(rvalue(evalNode(n.r, ctx))));

  const L = decay(evalNode(n.l, ctx));
  const R = decay(evalNode(n.r, ctx));

  /* 指针参与的运算：p+i / p-i（步长是被指向类型的大小）、p-q（给元素个数差）、
     指针之间的比较。数组已经先 decay 成指针了，所以这里只看 isPtr。 */
  const lp = isPtr(L.ty);
  const rp = isPtr(R.ty);
  if (lp && isInt(R.ty) && (o === '+' || o === '-')) {
    return ptrOffset(L, R, o);
  }
  if (rp && isInt(L.ty) && (o === '+' || o === '-')) {
    return ptrOffset(R, L, o);
  }
  if (lp && rp) {
    const lv = rvalue(L).val >>> 0;
    const rv = rvalue(R).val >>> 0;
    if (o === '-') {
      const bytes = ptrStride(L.ty);
      if (!bytes) throw exprErr(`${L.ty.name} 指向的类型不知道宽度，算不出两个指针相差几个元素`);
      return intRes(E_INT, BigInt(Math.trunc((lv - rv) / bytes)));
    }
    return cmpRes(ptrCmp(o, lv, rv));
  }
  if (lp || rp) throw exprErr(`${lp ? L.ty.name : R.ty.name} 不能这样参与 ${o}：指针只能和整数加减、和同类型指针相减或比较`);

  const a = rvalue(L);
  const b = rvalue(R);
  const ty = arithTy(a.ty, b.ty);
  if (isFlt(ty)) {
    const x = Number(a.val), y = Number(b.val);
    switch (o) {
      case '+': return { ty: ty, val: x + y };
      case '-': return { ty: ty, val: x - y };
      case '*': return { ty: ty, val: x * y };
      case '/': return { ty: ty, val: y === 0 ? (x === 0 ? NaN : (x > 0 ? Infinity : -Infinity)) : x / y };
      case '<': return cmpRes(x < y);
      case '<=': return cmpRes(x <= y);
      case '>': return cmpRes(x > y);
      case '>=': return cmpRes(x >= y);
      case '==': return cmpRes(x === y);
      case '!=': return cmpRes(x !== y);
      default: throw exprErr(`${ty.name} 不能 ${o}：位运算和取余只能用整数`);
    }
  }
  const x = toTyBig(ty, a.val);
  const y = toTyBig(ty, b.val);
  switch (o) {
    case '+': return intRes(ty, toTyBig(ty, x + y));
    case '-': return intRes(ty, toTyBig(ty, x - y));
    case '*': return intRes(ty, toTyBig(ty, x * y));
    case '/':
      if (y === 0n) throw exprErr('除以 0：C++ 里这是未定义行为，观察窗不猜结果');
      return intRes(ty, toTyBig(ty, x / y));
    case '%':
      if (y === 0n) throw exprErr('对 0 取余：C++ 里这是未定义行为，观察窗不猜结果');
      return intRes(ty, toTyBig(ty, x % y));
    case '&': return intRes(ty, x & y);
    case '|': return intRes(ty, x | y);
    case '^': return intRes(ty, x ^ y);
    case '<<': case '>>': {
      const c = Number(y);
      if (!Number.isInteger(c) || c < 0 || c >= ty.bits) {
        throw exprErr(`移位数 ${y} 超出了 ${ty.name} 的位宽（${ty.bits}），C++ 里这是未定义行为`);
      }
      return intRes(ty, o === '<<' ? toTyBig(ty, x << BigInt(c)) : toTyBig(ty, x >> BigInt(c)));
    }
    case '<': return cmpRes(x < y);
    case '<=': return cmpRes(x <= y);
    case '>': return cmpRes(x > y);
    case '>=': return cmpRes(x >= y);
    case '==': return cmpRes(x === y);
    case '!=': return cmpRes(x !== y);
    default: throw exprErr(`不认识运算符 ${o}`);
  }
}

function ptrCmp(o, x, y) {
  if (o === '==') return x === y;
  if (o === '!=') return x !== y;
  if (o === '<') return x < y;
  if (o === '<=') return x <= y;
  if (o === '>') return x > y;
  if (o === '>=') return x >= y;
  throw exprErr(`指针不能 ${o}`);
}

function ptrStride(t) {
  const pt = t && t.pt;
  if (!pt) return 0;
  if (pt.kind === 'arr') return dimProd(pt.dims) * (pt.elem ? pt.elem.bytes : 0);
  return pt.bytes || 0;
}

/* 指针 ± 整数：结果还是同类型指针，走的格数就是那个整数 */
function ptrOffset(P, Q, o) {
  const pv = rvalue(P);
  const qv = rvalue(Q);
  const bytes = ptrStride(pv.ty);
  if (!bytes) throw exprErr(`${pv.ty.name} 指向的类型不知道宽度（void* / 结构体指针），加减不了`);
  const k = typeof qv.val === 'bigint' ? Number(qv.val) : qv.val;
  if (!Number.isInteger(k)) throw exprErr('指针的偏移得是整数');
  return { ty: pv.ty, val: ((pv.val >>> 0) + (o === '+' ? k : -k) * bytes) >>> 0 };
}

function evalCast(n, ctx) {
  const ty = n.ty;
  const r = rvalue(evalNode(n.a, ctx));
  const src = numTy(r.ty);
  if (ty.kind === 'bool') return { ty: ty, val: truthy(r) ? 1 : 0 };
  if (isPtr(ty)) {
    if (isPtr(src)) return { ty: Object.assign({}, ty, { pt: src.pt }), val: r.val >>> 0 };
    if (isInt(src)) return { ty: ty, val: Number(toTyBig(E_UINT, r.val)) >>> 0 };
    throw exprErr(`${r.ty.name} 转不成 ${ty.name}`);
  }
  if (isPtr(src)) {
    if (!isInt(ty)) throw exprErr('指针只能转成整数，比如 (int)(p - q)');
    return intRes(ty, toTyBig(ty, BigInt(r.val >>> 0)));
  }
  if (isFlt(ty)) {
    if (!isInt(src) && !isFlt(src)) throw exprErr(`${r.ty.name} 转不成 ${ty.name}`);
    return { ty: ty, val: typeof r.val === 'bigint' ? Number(r.val) : Number(r.val) };
  }
  if (isInt(ty)) {
    if (isFlt(src)) {
      if (!Number.isFinite(r.val)) throw exprErr(`${r.val} 转成 ${ty.name} 在 C++ 里是未定义行为，观察窗不猜结果`);
      return intRes(ty, toTyBig(ty, BigInt(Math.trunc(r.val))));
    }
    if (!isInt(src)) throw exprErr(`${r.ty.name} 转不成 ${ty.name}`);
    return intRes(ty, toTyBig(ty, r.val));
  }
  throw exprErr(`不支持转成 ${ty.name}`);
}

function evalNode(n, ctx) {
  switch (n.k) {
    case 'lit': return { ty: n.ty, val: n.v };
    case 'id': return varValue(n.n, ctx);
    case 'un': return evalUn(n, ctx);
    case 'bin': return evalBin(n, ctx);
    case 'cast': return evalCast(n, ctx);
    case 'idx': return evalIdx(evalNode(n.a, ctx), n.i, ctx);
    case 'tern': return truthy(rvalue(evalNode(n.c, ctx))) ? evalNode(n.a, ctx) : evalNode(n.b, ctx);
    default: throw exprErr('表达式里有不支持的写法');
  }
}

/* ------------------------------------------------------------------ */
/* 观察窗（watch）                                                     */
/*                                                                    */
/* 悬停一次只能看一个名字，可循环里的循环变量、每轮都在改的数组、正在   */
/* 比较的那对元素是要一直盯着的。这里收的是表达式：a[i]、a[10]、*p、    */
/* pp[0][1]、i<n-1 && a[j]>a[j+1] 都行，求值走上面那一节。名单记进      */
/* localStorage，每次调试会话复用。                                    */
/*                                                                    */
/* 停在某行时看到的是「这一行开始前」的状态 —— 和悬停完全同一套数据：   */
/* 标量取快照的 val，数组和指针按登记的栈槽地址直接读共享内存。         */
/*                                                                    */
/* 数组在面板里只铺开前 8 个 —— 一行高度放 50 个就把别的行顶出视野了， */
/* 要看全的把鼠标放到源码里的变量名上（tooltip 给前 50 个）。           */
/* ------------------------------------------------------------------ */
const WATCH_KEY = 'cpp-playground.watch';
const WATCH_MAX = 24;
const WATCH_ARR_N = 8;
const WATCH_LEN = 80;

const watchEl = {
  list: $('wlist'), input: $('watch-add'), names: $('watch-names'), tip: $('watchtip'),
};
/* 表达式 -> {row, ty, val}；只在名单变化时重建 */
const watchRows = new Map();
const watchItems = loadWatch();

function loadWatch() {
  try {
    const raw = JSON.parse(localStorage.getItem(WATCH_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const s of raw) {
      if (typeof s !== 'string') continue;
      const t = s.trim();
      if (t && t.length <= WATCH_LEN && out.indexOf(t) < 0) out.push(t);
      if (out.length >= WATCH_MAX) break;
    }
    return out;
  } catch (e) { return []; }
}
function saveWatch() {
  try { localStorage.setItem(WATCH_KEY, JSON.stringify(watchItems)); } catch (e) {}
}

/* 名字 -> 变量描述。优先要「当前行快照过的那个」：同名有多个 alloca（两个
   for (int i...)、或者别的函数里的同名变量）时，只有这一行活着的那个才是
   人想看的东西。当前行没有它才退回全表按声明行挑最靠后的一个，那种情况下
   值八成是旧的，面板上会标出来。 */
function pickVar(name, line) {
  const live = liveVarsAt(line).get(name);
  if (live) return { v: live, live: true };
  let best = null;
  for (const v of dbg.vars || []) {
    if (v.name !== name) continue;
    if (!best || (v.line || 0) >= (best.line || 0)) best = v;
  }
  return best ? { v: best, live: false } : null;
}

/* 一行观察结果：表达式 -> {类型, 值, 状态}。
   会话没开始、式子写错、式子对的但这一行拿不到值，三种情况分开说 —— 面板上
   留着的永远是「这一行开始前」的状态，跟悬停同一个口径。 */
function watchValue(expr, line) {
  if (!dbg.active || !dbg.cb) return { ty: '—', val: '会话未开始', cls: 'idle' };
  const p = parseWatch(expr);
  if (p.err) return { ty: '—', val: p.err, cls: 'off' };
  const ctx = { line: line, cb: dbg.cb, stale: '' };
  try {
    const r = showRes(evalNode(p.ast, ctx), WATCH_ARR_N, STR_WATCH_N);
    return {
      ty: r.ty,
      val: r.text + ctx.stale,
      cls: ctx.stale ? 'stale' : '',
    };
  } catch (e) {
    if (e.expr) return { ty: '—', val: e.message, cls: 'off' };
    return { ty: '—', val: `求值出错：${e.message}`, cls: 'off' };
  }
}

function buildWatchRows() {
  for (const r of watchRows.values()) r.row.remove();
  watchRows.clear();
  for (const expr of watchItems) {
    const row = document.createElement('div');
    row.className = 'wrow';
    const n = document.createElement('span');
    n.className = 'wn'; n.textContent = expr;
    /* 表达式长了面板会截断（CSS 里 max-width + ellipsis），完整的一句挂在 title 上 */
    n.title = expr;
    const ty = document.createElement('span');
    ty.className = 'wt'; ty.textContent = '—';
    const val = document.createElement('span');
    val.className = 'wv'; val.textContent = '会话未开始';
    const x = document.createElement('button');
    x.className = 'wx mini secondary'; x.type = 'button';
    x.title = `不再观察 ${expr}`; x.textContent = '×';
    x.onclick = () => {
      watchItems.splice(watchItems.indexOf(expr), 1);
      saveWatch(); buildWatchRows(); refreshWatch();
    };
    row.append(n, ty, val, x);
    watchEl.list.appendChild(row);
    watchRows.set(expr, { row: row, ty: ty, val: val });
  }
  watchEl.list.classList.toggle('empty', !watchItems.length);
}

function refreshWatch() {
  if (!watchItems.length) return;
  const line = dbg.active && dbg.ctl ? dbg.ctl[DBG.S.LINE] : 0;
  for (const expr of watchItems) {
    const r = watchRows.get(expr);
    if (!r) continue;
    const o = watchValue(expr, line);
    r.ty.textContent = o.ty;
    r.val.textContent = o.val;
    r.row.className = 'wrow' + (o.cls ? ' ' + o.cls : '');
  }
}

/* 加完把提示写清楚。还没做过插桩构建时别乱报「构建里没有它」——
   那时变量表压根还是空的。表达式里挑出标识符逐个查名字，查得到的个数
   直接报出来，省得「a[i]」和「a[q]]」这种混在一句提示里看不出区别。 */
function exprIdents(ast) {
  const out = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.k === 'id') { out.push(n.n); return; }
    for (const key of ['l', 'r', 'a', 'b', 'c', 'i']) if (n[key]) walk(n[key]);
  })(ast);
  return [...new Set(out)];
}

function watchHint(expr) {
  const all = dbg.vars || [];
  const set = new Set(all.map((v) => v.name));
  const names = exprIdents(parseWatch(expr).ast || {});
  const miss = names.filter((n) => !set.has(n));
  if (!all.length) {
    watchEl.tip.textContent = `已加入 ${expr}`;
    watchEl.tip.className = 'wnote';
    return;
  }
  watchEl.tip.textContent = names.length
    ? (miss.length ? `已加入 ${expr}（本次构建的变量表里还没有 ${miss.join('、')}）` : `已加入 ${expr}`)
    : `已加入 ${expr}`;
  watchEl.tip.className = 'wnote' + (names.length && miss.length ? ' warn' : ' ok');
}

function watchAdd() {
  const src = watchEl.input.value.trim();
  if (!src) return;
  if (src.length > WATCH_LEN) {
    watchEl.tip.textContent = `一条表达式最多 ${WATCH_LEN} 个字符`;
    watchEl.tip.className = 'wnote bad';
    return;
  }
  const p = parseWatch(src);
  if (p.err) {
    watchEl.tip.textContent = `这句看不懂：${p.err}`;
    watchEl.tip.className = 'wnote bad';
    return;
  }
  if (!watchItems.includes(src)) {
    if (watchItems.length >= WATCH_MAX) {
      watchEl.tip.textContent = `最多同时观察 ${WATCH_MAX} 个`;
      watchEl.tip.className = 'wnote bad';
      return;
    }
    watchItems.push(src);
    saveWatch(); buildWatchRows();
  }
  watchEl.input.value = '';
  refreshWatch();
  watchHint(src);
}

/* 补全名单：变量表要插桩构建完才有，所以每次产物回来刷一遍。
   只是名字清单，跨函数的同名会合并成一项。 */
function fillWatchNames(list) {
  const set = new Set();
  for (const v of list || dbg.vars || []) if (v.name) set.add(v.name);
  watchEl.names.replaceChildren(...[...set].sort().map((s) => {
    const o = document.createElement('option');
    o.value = s;
    return o;
  }));
}

/* 新会话开场：把上一轮冻在面板上的值收掉，别让人误读成这一轮的。
   会话结束（退出 / 跑完 / 停止）时不叫它 —— 最后一次的观测值留着看，
   跟热力层一个待遇。 */
function resetWatch() {
  for (const r of watchRows.values()) {
    r.ty.textContent = '—';
    r.val.textContent = '等待执行…';
    r.row.className = 'wrow idle';
  }
}

watchEl.input.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') { ev.preventDefault(); watchAdd(); }
});
$('watch-push').onclick = watchAdd;
$('watch-clear').onclick = () => {
  watchItems.length = 0;
  saveWatch(); buildWatchRows();
  watchEl.tip.textContent = '已清空，名单存在浏览器里，下次调试还在';
  watchEl.tip.className = 'wnote';
};
buildWatchRows();

function dbgStopRun() {
  if (runWorker) { runWorker.terminate(); runWorker = null; }
  clearWatchdog();
  if (currentRun) {
    currentRun.resolve({ code: null, aborted: true, killed: false, ms: 0, memoryBytes: 0 });
    currentRun = null;
  }
}

function dbgQuit() {
  if (dbg.timer) clearInterval(dbg.timer);
  dbg.timer = 0;
  hideVarTip();
  /* 退场前补一次热力：dbgTick 最快也要 50 ms 后才跑，最后那几行的次数不能丢。
     注意这里只清「当前行」那层高亮，热力层要留着给人找热点，
     它由改源码 / 重开会话 / 手动清除三个入口撤掉。 */
  paintHeat();
  if (dbg.marker !== null && dbg.ctl) srcEditor.session.removeMarker(dbg.marker);
  dbgGutterMark(0, '');
  dbg.marker = null; dbg.markerRow = -1; dbg.markerCls = '';
  dbgSyncMarkers(); dbgClearMarkerDivs();
  dbg.lastLine = -1; dbg.lastParked = null;
  dbg.cb = null; dbg.ctl = null; dbg.bp = null; dbg.lines = null; dbg.active = false;
  dbg.vars = null; dbg.lineVars = null;
  dbgBar.classList.remove('on');
  dbgState.textContent = '—';
  srcEditor.setReadOnly(false);
  runBtn.disabled = false;
  debugBtn.disabled = false;
}

async function startDebugSession(built) {
  const cb = DBG.newControlBlock();
  if (!cb) { say('建不起调试控制块（SharedArrayBuffer）：' + (sabMissing() || '原因不明'), 'err'); return; }
  const lines = built.lines;
  cb.wr.fill(0);
  dbg.cb = cb; dbg.ctl = cb.ctl; dbg.bp = cb.bp; dbg.lines = lines;
  dbg.vars = built.vars || [];
  dbg.lineVars = built.lineVars || {};
  /* 上一轮的内存先收掉：新会话的 wasm 还没实例化，这时候拿旧 DataView 求值
     会把「上一次运行留下的字节」当成这一轮的值报出来。运行 Worker 实例化好
     新模块后会把它的 SharedArrayBuffer 递过来（每次 park 前还会再对一遍）。 */
  setGuestMemory(null);
  /* 新会话从空热力开始：上一轮的次数留在旧控制块里，行号却是按旧源码编的，
     混着画会指错热点。heat 是新建 SAB 上的一块，天生全 0，不用清。 */
  dbg.heatRows = lines;
  dbg.heatTick = 0;
  clearHeat();
  fillWatchNames();
  resetWatch();
  dbg.ctl[DBG.S.DELAY_US] = parseInt(dbgSpeed.value, 10) || 0;
  Atomics.store(dbg.ctl, DBG.S.MODE, DBG.MODE.RUN);
  Atomics.store(dbg.ctl, DBG.S.STATE, DBG.STATE.EXEC);
  syncBpTable();

  dbg.active = true;
  bgm.lastDigit = -1;      /* 新会话第一行一定要出声，别被上一段的「同音不重复」挡掉 */
  dbgBar.classList.add('on');
  srcEditor.setReadOnly(true);
  runBtn.disabled = true;
  debugBtn.disabled = false;      /* 再点一次 = 退出调试 */
  stopBtn.disabled = false;
  setDot('busy');
  say(`调试构建完成，${lines.length} 个行桩、${dbg.vars.length} 个可查变量，已启动，正在跟踪执行行…`, 'ok');
  newDecodeSession();
  /* 用 setInterval 而不是 requestAnimationFrame：后台标签页里 rAF 会停摆，
     切去看输出再切回来时高亮就冻住了；50ms 一帧对手工单步足够跟手。 */
  dbg.timer = setInterval(dbgTick, 50);

  /* 调试会话没有运行超时（第 3 个参数只在非调试时用到，这里给 0 占位） */
  const r = await runProgram(built.wasm, stdinEl.value, 0, cb.sab);
  closeDecodeSession();
  if (dbg.timer) clearInterval(dbg.timer);
  dbg.timer = 0;

  /* 调试没有超时，所以「停止 / 退出调试」是结束会话的正常出口：灯要收回中性，
     不能继续闪「运行中」，看着像程序还在跑。
     dbgQuit 里会补最后一次 paintHeat，热力层留在编辑器上，所以先收尾再报数。 */
  /* 「最后一站」按控制块里的 LINE 报：那是 worker 写的最后一个行桩，比 50 ms 轮询
     采到的 dbg.lastLine 准（全速档常常只采到跑到一半的行号，甚至一次都没采到）。
     LINE 为 0 说明一个行桩都没触发（main 之前就 trap 了），退回采样值。 */
  const last = (cb.ctl[DBG.S.LINE] | 0) || (dbg.lastLine > 0 ? dbg.lastLine : 0);
  if (r.aborted) { setDot(''); dbgQuit(); say('调试已结束' + heatSummary(), 'warn'); return; }
  /* worker 里测的 r.ms 把「停在某行等人放行」和「降速睡过去」的时间也算进去了。
     那不是程序在跑，是人在看，报成运行时间会离谱到几十秒。 */
  const parked = Atomics.load(cb.ctl, DBG.S.PARKED_MS);
  const slowed = Atomics.load(cb.ctl, DBG.S.SLOW_MS);
  const netMs = Math.max(0, r.ms - parked - slowed);
  const tip = parked + slowed > 0
    ? `暂停等待 ${parked} ms，降速停留 ${slowed} ms（均不计入运行耗时）`
    : '';
  setDot(r.code === 0 ? 'ready' : 'bad');
  metric('exit', r.code, r.code === 0 ? 'ok' : 'err');
  metric('run', netMs + ' ms', r.code === 0 ? '' : 'err', tip);
  if (r.memoryBytes) metric('mem', (r.memoryBytes / 1048576).toFixed(1) + ' MB');
  dbgQuit();
  say((r.note ? '运行出错：' + r.note : `程序结束（第 ${last > 0 ? last : '—'} 行是最后一站）`) + heatSummary(),
      r.code === 0 ? 'ok' : 'err');
}

async function doDebug() {
  if (busy) return;
  if (dbg.active) { dbgStopRun(); dbgQuit(); return; }
  if (!dbgSupported()) {
    setDot('bad');
    say('调试需要 SharedArrayBuffer：' + (sabMissing() || '条件看着都满足，可能被浏览器扩展拦了'), 'err');
    return;
  }
  busy = true;
  const t0 = performance.now();
  clearOutput();
  resetMetrics();
  newDecodeSession();
  try {
    if (!workerReady) await readyPromise;
    let built;
    try {
      built = await compile(srcEditor.getValue(), true);
    } catch (err) {
      closeDecodeSession();
      setDot('bad');
      const PHASE = { compile: '编译', link: '链接', instrument: '插桩' };
      if (err.phase) {
        metric('compile', (err.ms || 0) + ' ms', 'err');
        metric('exit', err.exitCode === undefined ? '—' : err.exitCode, 'err');
        say(`${PHASE[err.phase] || err.phase}失败（调试构建）`, 'err');
      } else if (err.jsError) {
        metric('compile', '异常', 'err');
        say('编译器内部错误', 'err');
        outEl.value += '\n' + err.jsError + '\n';
      } else {
        say('调试构建被中断', 'warn');
      }
      return;
    }
    closeDecodeSession();
    metric('compile', Math.round(performance.now() - t0) + ' ms', 'ok');
    if (!built.lines || !built.lines.length) {
      setDot('bad');
      say('这个源文件里没有可插桩的用户代码行（只有头文件里的代码？）', 'err');
      return;
    }
    await startDebugSession(built);
  } finally {
    clearWatchdog();
    busy = false;
    runBtn.disabled = false;
    stopBtn.disabled = true;
    updateSrcLen();
  }
}

/* ------------------------------------------------------------------ */
/* UI 绑定                                                            */
/* ------------------------------------------------------------------ */
function fillExamples() {
  const sel = $('examples');
  /* 用例多了以后按分组挂 optgroup，下拉框里能直接看到课程章节；
     分组顺序按「第一次出现」排，所以 EXAMPLES 的键序就是展示顺序。 */
  const groups = new Map();
  for (const name of Object.keys(EXAMPLES)) {
    const g = EXAMPLES[name].group || '其他';
    if (!groups.has(g)) {
      const og = document.createElement('optgroup');
      og.label = g;
      groups.set(g, og);
      sel.appendChild(og);
    }
    const o = document.createElement('option');
    o.textContent = name;
    groups.get(g).appendChild(o);
  }
  sel.onchange = () => {
    const e = EXAMPLES[sel.value];
    setSource(e.code);
    stdinEl.value = e.stdin;
    saveLocal();
  };
}

function saveLocal() {
  try {
    localStorage.setItem('cpp-playground.src', srcEditor.getValue());
    localStorage.setItem('cpp-playground.stdin', stdinEl.value);
  } catch (e) { /* 忽略 */ }
}

srcEditor.on('change', () => { updateSrcLen(); saveLocal(); });
stdinEl.addEventListener('input', saveLocal);

/* Ace 内部快捷键（不走 document，避免焦点在编辑器里时漏掉） */
srcEditor.commands.addCommand({
  name: 'runAndGo',
  bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
  exec: () => doRun(),
});
srcEditor.commands.addCommand({
  name: 'stopAndGo',
  bindKey: { win: 'Ctrl-.', mac: 'Cmd-.' },
  exec: () => stopAll(),
});
srcEditor.commands.addCommand({
  name: 'debugAndGo',
  bindKey: { win: 'Ctrl-Shift-Enter', mac: 'Cmd-Shift-Enter' },
  exec: () => doDebug(),
});
srcEditor.commands.addCommand({
  name: 'toggleBreakpoint',
  bindKey: { win: 'Ctrl-B', mac: 'Cmd-B' },
  exec: (ed) => toggleBreakpoint(ed.getCursorPosition().row),
});

/* 双击行号切换断点。装订线事件在 ace 1.45 里叫 gutterdblclick，行号用
   getGutterRow() 拿（这个版本没有 getDocumentRow()，也没有坐标换算的公开接口）。
   单按 Ctrl+B 走当前光标行，两条路都不需要坐标。 */
srcEditor.on('gutterdblclick', (e) => {
  const row = typeof e.getGutterRow === 'function'
    ? e.getGutterRow()
    : (e.getDocumentPosition ? e.getDocumentPosition().row : -1);
  if (row === undefined || row === null || row < 0) return;
  if (typeof e.stop === 'function') e.stop();
  toggleBreakpoint(row);
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) doDebug(); else doRun();
  }
  /* Ctrl/Cmd+B：在当前光标行增删断点，和双击行号走同一个函数 */
  if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
    e.preventDefault();
    toggleBreakpoint(srcEditor.getSelection().getCursor().row);
  }
  if (e.key === 'Escape') stopAll();
});

runBtn.onclick = doRun;
debugBtn.onclick = doDebug;
stopBtn.onclick = stopAll;
clearBtn.onclick = () => { outEl.value = ''; $('outlen').textContent = ''; };
reloadBtn.onclick = () => {
  if (dbg.active) { dbgStopRun(); dbgQuit(); }
  outEl.value = '';
  startCompileWorker();
};

$('dbg-cont').onclick = () => dbgCmd(DBG.MODE.RUN);
$('dbg-step').onclick = () => dbgCmd(DBG.MODE.STEP);
$('dbg-pause').onclick = dbgPause;
$('dbg-quit').onclick = () => { dbgStopRun(); dbgQuit(); };
$('heat-clear').onclick = clearHeat;
dbgSpeed.onchange = () => {
  if (dbg.ctl) dbg.ctl[DBG.S.DELAY_US] = parseInt(dbgSpeed.value, 10) || 0;
};

/* ------------------------------------------------------------------ */
fillExamples();
let restored = false;
try {
  const s = localStorage.getItem('cpp-playground.src');
  const i = localStorage.getItem('cpp-playground.stdin');
  if (s) { setSource(s); if (i !== null) stdinEl.value = i; restored = true; }
} catch (e) { /* 忽略 */ }
if (!restored) {
  $('examples').value = Object.keys(EXAMPLES)[0];
  setSource(EXAMPLES[$('examples').value].code);
  stdinEl.value = EXAMPLES[$('examples').value].stdin;
}
srcEditor.focus();
startCompileWorker();
