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
        compileResolve && compileResolve({
          wasm: m.wasm, lines: m.lines || null,
          vars: m.vars || null, lineVars: m.lineVars || null,
        });
      }
      else { compileReject && compileReject({ phase: m.phase, ms: m.ms, exitCode: m.exitCode }); }
      break;
    case 'error':
      setDot('bad');
      say('编译器侧错误', 'err');
      outEl.value += '\n' + m.message + '\n';
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
};

function dbgSupported() { return typeof SharedArrayBuffer !== 'undefined'; }

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

/* 把一个快照还原成人类可读的值：kind 决定怎么解释那两个 int32 */
function fmtVar(v, lo, hi) {
  const u = lo >>> 0;
  const uh = hi >>> 0;
  const bits = v.bits || 32;
  if (v.kind === 'bool') return u ? 'true' : 'false';
  if (v.kind === 'float') {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setUint32(0, u, true);
    dv.setUint32(4, uh, true);
    const x = bits === 32 ? dv.getFloat32(0, true) : dv.getFloat64(0, true);
    if (Number.isNaN(x)) return 'NaN';
    if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
    return Object.is(x, -0) ? '-0' : String(x);
  }
  if (v.kind === 'ptr') return '0x' + u.toString(16).padStart(8, '0');
  let s;
  if (bits === 64) {
    /* 64 位用 BigInt，免得超过 2^53 掉精度 */
    s = (v.signed ? (BigInt(hi) << 32n) | BigInt(u)
                  : (BigInt(uh) << 32n) | BigInt(u)).toString();
  } else if (bits === 32) {
    s = String(v.signed ? (lo | 0) : u);
  } else {
    const m = (1 << bits) - 1;
    let x = u & m;
    if (v.signed && (x & (1 << (bits - 1)))) x -= (1 << bits);
    s = String(x);
    if (bits === 8 && /char/.test(v.tname || '')) {
      const g = x >= 32 && x < 127 ? `'${String.fromCharCode(x)}' ` : '';
      s = `${g}${x}`;
    }
  }
  return s;
}

/* 停在某行时能看到的变量：名字 -> 变量描述（同一行重名取第一个） */
function liveVarsAt(line) {
  const map = new Map();
  const ids = (dbg.lineVars && dbg.lineVars[String(line)]) || [];
  for (const id of ids) {
    const v = dbg.vars && dbg.vars[id];
    if (v && !map.has(v.name)) map.set(v.name, v);
  }
  return map;
}

function varTipText(name, v, line) {
  const head = `${name} : ${v.tname || '?'}`;
  if (v.kind === 'obj' || v.kind === 'unknown') {
    return `${head} = 结构体/数组，暂不展开`;
  }
  if (!dbg.cb || !dbg.cb.wr[v.id]) return `${head} = 尚无快照`;
  const lo = dbg.cb.val[v.id * 2];
  const hi = dbg.cb.val[v.id * 2 + 1];
  const note = v.line === line ? '（本行声明，可能还没赋值）' : '';
  return `${head} = ${fmtVar(v, lo, hi)}${note}`;
}

/* 悬停查变量。注意不能用 e.target 是不是 .ace_identifier 的 span 来判断：
   Ace 的 .ace_layer 整层 pointer-events: none（它自己的 CSS 里写了，为了 Safari
   滚轮不被打断），真实鼠标事件的 target 永远是 div.ace_content，压根拿不到 span。
   所以走坐标反查：clientX/Y -> 文档行列 -> 该位置的 token。 */
srcEditor.container.addEventListener('mousemove', (ev) => {
  if (!(dbg.active && dbg.ctl) || Atomics.load(dbg.ctl, DBG.S.STATE) !== DBG.STATE.PARK) {
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
  if (!name) { hideVarTip(); return; }
  const line = dbg.ctl[DBG.S.LINE];
  const v = liveVarsAt(line).get(name);
  if (!v) { hideVarTip(); return; }
  varTipEl.textContent = varTipText(name, v, line);
  varTipEl.style.display = 'block';
  const w = varTipEl.offsetWidth, h = varTipEl.offsetHeight;
  varTipEl.style.left = Math.min(ev.clientX + 14, innerWidth - w - 8) + 'px';
  varTipEl.style.top = (ev.clientY + 16 + h > innerHeight ? ev.clientY - h - 8 : ev.clientY + 16) + 'px';
});
srcEditor.container.addEventListener('mouseleave', hideVarTip);

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
  if (!cb) { say('拿不到 SharedArrayBuffer，无法调试', 'err'); return; }
  const lines = built.lines;
  cb.wr.fill(0);
  dbg.cb = cb; dbg.ctl = cb.ctl; dbg.bp = cb.bp; dbg.lines = lines;
  dbg.vars = built.vars || [];
  dbg.lineVars = built.lineVars || {};
  dbg.ctl[DBG.S.DELAY_US] = parseInt(dbgSpeed.value, 10) || 0;
  Atomics.store(dbg.ctl, DBG.S.MODE, DBG.MODE.RUN);
  Atomics.store(dbg.ctl, DBG.S.STATE, DBG.STATE.EXEC);
  syncBpTable();

  dbg.active = true;
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
     不能继续闪「运行中」，看着像程序还在跑。 */
  if (r.aborted) { setDot(''); say('调试已结束', 'warn'); dbgQuit(); return; }
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
  say(r.note ? '运行出错：' + r.note : `程序结束（第 ${dbg.lastLine > 0 ? dbg.lastLine : '—'} 行是最后一站）`,
      r.code === 0 ? 'ok' : 'err');
  dbgQuit();
}

async function doDebug() {
  if (busy) return;
  if (dbg.active) { dbgStopRun(); dbgQuit(); return; }
  if (!dbgSupported()) {
    setDot('bad');
    say('调试需要 SharedArrayBuffer：请从带 COOP/COEP 响应头的 serve.py 打开本页', 'err');
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
