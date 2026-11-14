/* examples.cpp.js — C++ 示例集，纯数据没有逻辑。
   语言登记表 js/langs.js 把它挂到 cpp 那一项上；再加一门语言就是再放一份
   examples.<id>.js，主流程不用改。键序就是下拉框里的展示顺序，group 决定分组。 */
'use strict';

const CPP_EXAMPLES = {
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
#include <algorithm>
#include <string>
#include <cstring>
using namespace std;

const int N = 10;

/* 三种排序统计的基本操作不一样，单位也得跟着变：插入是「移动」（后移 + 落位各算一次），
   冒泡和快排是「交换」。传字符串进去，输出就不至于把交换说成移动。
   全部用普通数组：长度自己带着走（n），排序函数按 [l, r) 处理。 */
void show(const string& tag, const int a[], int n, long long cmp, long long mv,
          const string& unit) {
    cout << tag << "：比较 " << cmp << " 次，" << unit << " " << mv << " 次  ";
    for (int i = 0; i < n; i++) cout << a[i] << ' ';
    cout << "\\n";
}

void insertionSort(int a[], int n) {
    long long cmp = 0, mv = 0;
    for (int i = 1; i < n; ++i) {
        int x = a[i], j = i - 1;
        while (j >= 0) {
            ++cmp;
            if (a[j] <= x) break;
            a[j + 1] = a[j]; ++mv; --j;      // 后移一位
        }
        a[j + 1] = x; ++mv;
    }
    show("插入排序", a, n, cmp, mv, "移动");
}

void bubbleSort(int a[], int n) {
    long long cmp = 0, swp = 0;
    for (int i = 0; i < n - 1; ++i) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; ++j) {
            ++cmp;
            if (a[j] > a[j + 1]) { swap(a[j], a[j + 1]); ++swp; swapped = true; }
        }
        if (!swapped) break;                  // 一整趟没交换就已经有序
    }
    show("冒泡排序", a, n, cmp, swp, "交换");
}

long long qcmp = 0, qswp = 0;                  // 快排的比较/交换次数（递归里累加，图省事放全局）
int partition(int a[], int l, int r) {         // Lomuto：拿最右边当基准
    int x = a[r], i = l;
    for (int j = l; j < r; ++j) {
        ++qcmp;
        if (a[j] <= x) { swap(a[i], a[j]); ++i; ++qswp; }
    }
    swap(a[i], a[r]); ++qswp;                  // 基准落位也算一次交换
    return i;
}
void quickSort(int a[], int l, int r) {
    if (l >= r) return;
    int p = partition(a, l, r);
    quickSort(a, l, p - 1);
    quickSort(a, p + 1, r);
}

int main() {
    int a[N] = {9, 7, 5, 3, 1, 8, 6, 4, 2, 0};
    cout << "原始数据：";
    for (int i = 0; i < N; i++) cout << a[i] << ' ';
    cout << "\\n\\n";
    /* 普通数组没有「传值即复制」这回事，得自己拷一份：
       每种排序都从同一份原始数据开始，才好比较。 */
    int b[N];
    memcpy(b, a, sizeof(a));
    insertionSort(b, N);
    memcpy(b, a, sizeof(a));
    bubbleSort(b, N);
    memcpy(b, a, sizeof(a));
    quickSort(b, 0, N - 1);
    show("快速排序", b, N, qcmp, qswp, "交换");
    cout << "\\n同一组数据，插入和冒泡都是 O(n^2)，快排这里比较次数明显更少。\\n";
    return 0;
}
`,
  },
  '归并排序 + 逆序对计数': {
    group: '排序',
    stdin: '',
    code: `#include <iostream>
using namespace std;

const int N = 10;

// 归并的同时数逆序对：右半的元素要先出来时，左半剩下的 m-i 个都比它大
long long mergeSort(int a[], int tmp[], int l, int r) {
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
    int a[N] = {5, 3, 8, 1, 9, 2, 7, 4, 6, 0};
    int tmp[N];                        // 归并用的中转数组，大小跟 a 一样
    cout << "排序前：";
    for (int i = 0; i < N; i++) cout << a[i] << ' ';
    cout << "\\n";
    long long cnt = mergeSort(a, tmp, 0, N);
    cout << "排序后：";
    for (int i = 0; i < N; i++) cout << a[i] << ' ';
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
#include <algorithm>
using namespace std;

const int CAP = 32;

int binSearch(const int a[], int n, int key) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;          // 写 (lo + hi) / 2 会溢出
        if (a[mid] == key) return mid;
        if (a[mid] < key) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}

int main() {
    int a[CAP] = {1, 3, 5, 7, 9, 11, 13, 15};
    int n = 8;                                 // 普通数组不会自己记长度，得自己带着
    /* 中间插入：后面的整体后移一位，O(n) */
    int pos = 3;
    for (int i = n; i > pos; i--) a[i] = a[i - 1];
    a[pos] = 6;
    n++;
    cout << "下标 3 插入 6：";
    for (int i = 0; i < n; i++) cout << a[i] << ' ';
    cout << "\\n";
    /* 删头：整体前移一位，O(n) */
    for (int i = 0; i < n - 1; i++) a[i] = a[i + 1];
    n--;
    cout << "删掉首元素：";
    for (int i = 0; i < n; i++) cout << a[i] << ' ';
    cout << "\\n\\n";

    int keys[4] = {7, 10, 15, 1};
    for (int i = 0; i < 4; i++) {
        int key = keys[i];
        int p = binSearch(a, n, key);
        cout << "二分查 " << key << " -> ";
        if (p < 0) cout << "不存在\\n"; else cout << "下标 " << p << "\\n";
    }
    /* STL 算法照样能用，只要给的是首指针和尾指针：lower_bound(a, a + n, 8) */
    cout << "lower_bound(8) 的下标 = "
         << lower_bound(a, a + n, 8) - a << "\\n";
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
using namespace std;

const int CAP = 32;
int heap[CAP];                        // 小顶堆：堆顶永远是最小的
int hn = 0;                           // 堆里有多少个元素

/* 入堆：先塞到末尾，再一路上浮（跟父亲比，大的往上走） */
void hpush(int x) {
    int i = hn++;
    heap[i] = x;
    while (i > 0) {
        int p = (i - 1) / 2;
        if (heap[p] <= heap[i]) break;
        int t = heap[p]; heap[p] = heap[i]; heap[i] = t;
        i = p;
    }
}

/* 出堆：把堆顶换到末尾，末尾那个再下沉回坑里，返回弹出的那个 */
int hpop() {
    if (hn == 0) return 0;
    int top = heap[0];
    heap[0] = heap[--hn];
    int i = 0;
    while (true) {
        int l = 2 * i + 1, r = 2 * i + 2, s = i;
        if (l < hn && heap[l] < heap[s]) s = l;
        if (r < hn && heap[r] < heap[s]) s = r;
        if (s == i) break;
        int t = heap[i]; heap[i] = heap[s]; heap[s] = t;
        i = s;
    }
    return top;
}

int main() {
    int w[8] = {1, 3, 5, 2, 8, 4, 7, 6};
    // 小顶堆：每次拿最小的两堆合并，就是哈夫曼贪心
    for (int i = 0; i < 8; i++) hpush(w[i]);

    long long cost = 0;
    cout << "初始重量：";
    for (int i = 0; i < 8; i++) cout << w[i] << ' ';
    cout << "\\n合并过程：";
    while (hn > 1) {
        int a = hpop(), b = hpop();
        cost += a + b;
        cout << a << "+" << b << "=" << a + b << "  ";
        hpush(a + b);
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
#include <queue>
#include <algorithm>
using namespace std;

const int N = 6;
const int MAXD = 8;                 // 每个点最多存几个邻居
int adj[N][MAXD];                   // 邻接表：adj[u] 是 u 的邻居，deg[u] 是个数
int deg[N];
bool vis[N];

void dfs(int u) {
    vis[u] = true;
    cout << u << ' ';
    for (int k = 0; k < deg[u]; k++) if (!vis[adj[u][k]]) dfs(adj[u][k]);
}

int main() {
    int edges[7][2] = {{0,1}, {0,2}, {1,3}, {2,3}, {3,4}, {4,5}, {2,5}};
    for (int i = 0; i < 7; ++i) {             // 无向图：两条边都存
        adj[edges[i][0]][deg[edges[i][0]]++] = edges[i][1];
        adj[edges[i][1]][deg[edges[i][1]]++] = edges[i][0];
    }
    cout << "邻接表：\\n";
    for (int i = 0; i < N; ++i) {
        cout << "  " << i << ": ";
        for (int k = 0; k < deg[i]; k++) cout << adj[i][k] << ' ';
        cout << "\\n";
    }

    cout << "\\nDFS（递归）：";
    dfs(0);

    fill(vis, vis + N, false);
    cout << "\\nBFS（队列）：";
    queue<int> q;
    q.push(0); vis[0] = true;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        cout << u << ' ';
        for (int k = 0; k < deg[u]; k++) {
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
    code: `#include <iostream>
using namespace std;

const int N = 5;
const int MAXD = 8;                  // 每个点最多几个邻居
const int INF = 1000000000;

int adjv[N][MAXD];                   // 邻接表：邻点 + 权
int adjw[N][MAXD];
int deg[N];
int d[N], pre[N];                    // 最短距离 / 前驱

/* 数组版小顶堆，元素是 (距离, 顶点)，按 (距离, 顶点) 字典序比，
   跟 std::priority_queue<pair<int,int>, ..., greater<>> 的顺序一致。 */
struct Item { int d, u; };
Item heap[N * MAXD];
int hn = 0;

bool lessItem(const Item& a, const Item& b) {
    return a.d != b.d ? a.d < b.d : a.u < b.u;
}
void hpush(int dist, int u) {
    int i = hn++;
    heap[i].d = dist; heap[i].u = u;
    while (i > 0) {
        int p = (i - 1) / 2;
        if (!lessItem(heap[i], heap[p])) break;
        Item t = heap[p]; heap[p] = heap[i]; heap[i] = t;
        i = p;
    }
}
Item hpop() {
    Item top = heap[0];
    heap[0] = heap[--hn];
    int i = 0;
    while (true) {
        int l = 2 * i + 1, r = 2 * i + 2, s = i;
        if (l < hn && lessItem(heap[l], heap[s])) s = l;
        if (r < hn && lessItem(heap[r], heap[s])) s = r;
        if (s == i) break;
        Item t = heap[i]; heap[i] = heap[s]; heap[s] = t;
        i = s;
    }
    return top;
}

int main() {
    int e[7][3] = {{0,1,4}, {0,2,1}, {2,1,2}, {1,3,1}, {2,3,5}, {3,4,3}, {0,3,100}};
    for (int i = 0; i < 7; ++i) {
        int u = e[i][0], v = e[i][1], w = e[i][2];
        adjv[u][deg[u]] = v; adjw[u][deg[u]] = w; deg[u]++;
    }
    for (int i = 0; i < N; i++) { d[i] = INF; pre[i] = -1; }
    d[0] = 0;
    hpush(0, 0);
    while (hn > 0) {
        Item it = hpop();
        int du = it.d, u = it.u;
        if (du > d[u]) continue;              // 旧记录，跳过
        for (int k = 0; k < deg[u]; k++) {
            int v = adjv[u][k], w = adjw[u][k];
            if (d[v] > du + w) {
                d[v] = du + w;
                pre[v] = u;
                hpush(d[v], v);
            }
        }
    }

    for (int i = 0; i < N; i++) {
        cout << "0 -> " << i << " = " << (d[i] >= INF ? -1 : d[i]) << "  路径 ";
        int path[N];
        int len = 0;
        for (int x = i; x != -1; x = pre[x]) path[len++] = x;
        for (int k = len - 1; k >= 0; --k) cout << path[k] << (k ? " -> " : "");
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
#include <algorithm>
using namespace std;

const int MAXN = 64;

struct DSU {
    int fa[MAXN], sz[MAXN];
    DSU(int n) { for (int i = 0; i < n; ++i) { fa[i] = i; sz[i] = 1; } }

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
    int pairs[7][2] = {{0,1}, {1,2}, {3,4}, {5,6}, {6,7}, {2,3}, {0,4}};
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
using namespace std;

const int MAXP = 64;

// pi[i] = p[0..i] 里「最长的相等公共前后缀」长度，失配时靠它回退，不回读文本
void prefixFunction(const string& p, int pi[], int n) {
    pi[0] = 0;
    for (int i = 1, j = 0; i < n; ++i) {
        while (j > 0 && p[i] != p[j]) j = pi[j - 1];
        if (p[i] == p[j]) ++j;
        pi[i] = j;
    }
}

int main() {
    string s = "abababcaabababcab", p = "ababc";
    int pi[MAXP];
    prefixFunction(p, pi, (int)p.size());
    cout << "模式串 p = " << p << "\\nnext 表：";
    for (int i = 0; i < (int)p.size(); ++i) cout << pi[i] << ' ';
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
#include <string>
#include <cstring>
using namespace std;

const int B = 7;                              // 桶数
const int MAXK = 64;                          // 最多 64 个键
const int MAXLEN = 16;                        // 键长上限

struct Node {
    char key[MAXLEN];                         // 键
    int val;                                  // 值
    int next;                                 // 同桶里的下一个节点下标，-1 是链尾
};

struct HashTable {
    Node nodes[MAXK];
    int head[B];                              // 每个桶的链表头
    int cnt;
    HashTable() { for (int i = 0; i < B; ++i) head[i] = -1; cnt = 0; }

    int idx(const string& k) const {          // 多项式滚动哈希，再除留余数
        unsigned h = 0;
        for (size_t i = 0; i < k.size(); ++i) h = h * 131u + (unsigned)k[i];
        return (int)(h % (unsigned)B);
    }
    void put(const string& k, int v) {
        int b = idx(k);
        for (int i = head[b]; i != -1; i = nodes[i].next)
            if (k == nodes[i].key) { nodes[i].val = v; return; }
        /* 没找到：挂到链尾（跟原来 list 的 push_back 一个顺序，
           打印出来的桶内容才一模一样）。链是「下标串起来」的，
           不用真的分配节点。 */
        int last = head[b];
        while (last != -1 && nodes[last].next != -1) last = nodes[last].next;
        int id = cnt++;
        strcpy(nodes[id].key, k.c_str());
        nodes[id].val = v;
        nodes[id].next = -1;
        if (last == -1) head[b] = id; else nodes[last].next = id;
    }
    int* get(const string& k) {
        int b = idx(k);
        for (int i = head[b]; i != -1; i = nodes[i].next)
            if (k == nodes[i].key) return &nodes[i].val;
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
        for (int p = t.head[i]; p != -1; p = t.nodes[p].next)
            cout << " " << t.nodes[p].key << "(" << t.nodes[p].val << ")";
        cout << "\\n";
    }
    const char* keys[3] = {"apple", "fig", "grape"};
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
    int a[10];
    for (int i = 0; i < 10; i++) a[i] = i + 1;   // 原来用 iota
    mt19937 g(20261105);                    // <random>，固定种子所以结果可复现
    shuffle(a, a + 10, g);                 // <algorithm>，指针也是随机访问迭代器
    cout << "打乱后：";
    for (int i = 0; i < 10; i++) cout << a[i] << ' ';
    cout << "\\n";

    sort(a, a + 10);
    cout << "排序后：";
    for (int i = 0; i < 10; i++) cout << a[i] << ' ';
    cout << "\\n";

    set<int> s(a, a + 10);                 // <set>
    unordered_map<int, int> cnt;            // <unordered_map>
    for (int x : a) ++cnt[x];
    cout << "不同元素 " << s.size() << " 个，累加和 "
         << accumulate(a, a + 10, 0) << "，最大 " << a[9] << "\\n";
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
#include <algorithm>

struct Student { std::string name; int score; };
const int MAXS = 64;                          // 最多 64 个学生

int main() {
    int n;
    if (!(std::cin >> n)) { std::cerr << "没有读到人数\\n"; return 1; }
    if (n > MAXS) { std::cerr << "人数超过 " << MAXS << " 了\\n"; return 1; }

    Student a[MAXS];
    for (int i = 0; i < n; i++) std::cin >> a[i].name >> a[i].score;

    std::sort(a, a + n,
              [](const Student& x, const Student& y) { return x.score > y.score; });

    std::cout << "成绩排名（降序）:\\n";
    for (int i = 0; i < n; i++)
        std::cout << i + 1 << ". " << a[i].name << "  " << a[i].score << "\\n";

    double avg = 0;
    for (int i = 0; i < n; i++) avg += a[i].score;
    std::cout << "平均分: " << avg / n << "\\n";
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

unsigned long long fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }

int main() {
    int n; std::cin >> n;
    std::cout << "fib(" << n << ") = " << fib(n) << std::endl;
    // 1M 个 double：栈上放不下（8 MB 会爆），放堆上
    const int M = 1 << 20;
    double* buf = new double[M];
    for (int i = 0; i < M; i++) buf[i] = 0.5;
    double s = 0; for (int i = 0; i < M; i++) s += buf[i];
    std::cout << "1M 个 double 的和 = " << s << std::endl;
    delete[] buf;
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
int main() {
    int v[1];            // 普通数组
    v.adn(1);            // 拼错了
    int n = "abc";       // 类型不对
    std::cout << v[0] << n;
}
`,
  },

  /* ------------------------------------------------------------------ */
  /* 下面这批摘自《Hello 算法》（https://www.hello-algo.com/）的示例代码， */
  /* 按书里的章节归到各组：线性表 / 栈与队列 / 堆 / 哈希 / 树 / 回溯 /   */
  /* 复杂度 / 基础。书里给的是片段，这里都补成了能直接跑的完整程序——    */
  /* 片段本身没 main、也不打印，跑起来没东西看。                        */
  /* ------------------------------------------------------------------ */
  '数组：栈上与堆上初始化': {
    group: '线性表',
    stdin: '',
    code: `#include <iostream>
using namespace std;

/* 《Hello 算法》「数组」一节：同样是五个数，放的地方不一样。
   栈上：编译器分配，函数返回就还回去了。
   堆上：new 出来，得自己 delete，忘了就是内存泄漏。 */
int main() {
    // 存储在栈上
    int arr[5];
    for (int i = 0; i < 5; i++) arr[i] = i * i;
    cout << "栈上数组（没初始值，逐个赋值）：";
    for (int i = 0; i < 5; i++) cout << ' ' << arr[i];
    cout << endl;

    int nums[5] = { 1, 3, 2, 5, 4 };
    cout << "栈上数组（有初始值）：";
    for (int x : nums) cout << ' ' << x;
    cout << endl;

    // 存储在堆上（需要手动释放空间）
    int* arr1 = new int[5];
    for (int i = 0; i < 5; i++) arr1[i] = 10 + i;
    cout << "堆上数组（没初始值）：";
    for (int i = 0; i < 5; i++) cout << ' ' << arr1[i];
    cout << endl;
    delete[] arr1;                     // 堆上的要自己还

    int* nums1 = new int[5] { 1, 3, 2, 5, 4 };
    cout << "堆上数组（有初始值）：";
    for (int i = 0; i < 5; i++) cout << ' ' << nums1[i];
    cout << endl;
    delete[] nums1;
    return 0;
}
`,
  },
  '链表：节点定义与构建': {
    group: '线性表',
    stdin: '',
    code: `#include <iostream>
using namespace std;

/* 《Hello 算法》「链表」一节：节点由「值 + 指向下一个节点的指针」组成。
   数组靠下标定位，链表靠指针串起来；插删不用搬数据，代价是找第 k 个得一步步走。 */
struct ListNode {
    int val;         // 节点值
    ListNode *next;  // 指向下一节点的指针
    ListNode(int x) : val(x), next(nullptr) {}  // 构造函数
};

void printList(ListNode *head) {
    for (ListNode *p = head; p != nullptr; p = p->next) {
        cout << p->val;
        if (p->next) cout << " -> ";
    }
    cout << endl;
}

int main() {
    /* 初始化链表 1 -> 3 -> 2 -> 5 -> 4 */
    // 初始化各个节点
    ListNode* n0 = new ListNode(1);
    ListNode* n1 = new ListNode(3);
    ListNode* n2 = new ListNode(2);
    ListNode* n3 = new ListNode(5);
    ListNode* n4 = new ListNode(4);
    // 构建节点之间的引用
    n0->next = n1;
    n1->next = n2;
    n2->next = n3;
    n3->next = n4;

    printList(n0);

    // 链表没有 size 字段，长度只能一步步数出来
    int len = 0;
    for (ListNode *p = n0; p != nullptr; p = p->next) len++;
    cout << "链表长度：" << len << endl;

    // 释放：逐个 delete
    ListNode *cur = n0;
    while (cur) { ListNode *nxt = cur->next; delete cur; cur = nxt; }
    return 0;
}
`,
  },
  '双向链表：节点定义与摘除': {
    group: '线性表',
    stdin: '',
    code: `#include <iostream>
using namespace std;

/* 《Hello 算法》「常见链表类型」：单链表只能往前走，双向链表多一个 prev，
   删掉当前节点时不用再回头找前驱。 */
struct ListNode {
    int val;         // 节点值
    ListNode *next;  // 指向后继节点的指针
    ListNode *prev;  // 指向前驱节点的指针
    ListNode(int x) : val(x), next(nullptr), prev(nullptr) {}  // 构造函数
};

void printList(ListNode *head) {
    for (ListNode *p = head; p != nullptr; p = p->next) {
        cout << p->val;
        if (p->next) cout << " -> ";
    }
    cout << endl;
}

int main() {
    ListNode* n0 = new ListNode(1);
    ListNode* n1 = new ListNode(3);
    ListNode* n2 = new ListNode(2);
    n0->next = n1; n1->prev = n0;
    n1->next = n2; n2->prev = n1;

    cout << "正向：";
    printList(n0);
    cout << "反向：";
    for (ListNode *p = n2; p != nullptr; p = p->prev) cout << p->val << ' ';
    cout << endl;

    // 摘掉 n1：prev 和 next 各改一次，不用从头找前驱
    n0->next = n1->next;
    n1->next->prev = n0;
    delete n1;
    cout << "删掉 3 之后正向：";
    printList(n0);

    delete n0;
    delete n2;
    return 0;
}
`,
  },
  '列表：增删改查与排序': {
    group: '线性表',
    stdin: '',
    code: `#include <iostream>
#include <algorithm>
using namespace std;

const int CAP = 16;                       // 顺序表的空间上限

void show(const char* tag, const int nums[], int len) {
    cout << tag;
    for (int i = 0; i < len; i++) cout << ' ' << nums[i];
    cout << endl;
}

int main() {
    /* 《Hello 算法》「列表」一节：书里用 vector，这里换成普通数组。
       普通数组不会自己记长度，所以长度得自己带着（len）；
       中间插入、删除都要把后面的元素整体挪位置。 */
    // 初始化列表
    int nums[CAP] = {1, 3, 2, 5, 4};
    int len = 5;
    show("初始化：", nums, len);

    // 访问元素
    int num = nums[1];                    // 访问索引 1 处的元素
    cout << "索引 1 处：" << num << endl;
    // 更新元素
    nums[1] = 0;                          // 将索引 1 处的元素更新为 0
    show("更新索引 1 之后：", nums, len);

    // 在尾部添加元素
    nums[len++] = 6;
    // 在中间插入元素：后面的整体后移一位（从末尾开始挪，先挪的别覆盖）
    int pos = 2;
    for (int i = len; i > pos; i--) nums[i] = nums[i - 1];
    nums[pos] = 9;
    len++;
    show("插入 9 之后：", nums, len);
    // 删除元素：后面的整体前移一位
    for (int i = pos; i < len - 1; i++) nums[i] = nums[i + 1];
    len--;
    show("删掉索引 2 之后：", nums, len);

    // 遍历列表：按索引遍历，只走 len 个
    int count = 0;
    for (int i = 0; i < len; i++) count += nums[i];
    cout << "按下标遍历求和：" << count << endl;
    // range-for 就没法用了：它把整个数组（CAP 个格子）都走一遍，
    // 刚才删掉的那个位置还留着旧值 6，会被算进去
    int count2 = 0;
    for (int x : nums) count2 += x;
    cout << "range-for 求和（把没用的格子也算进去了）：" << count2 << endl;

    // 拼接列表
    int nums2[5] = {6, 8, 7, 10, 9};
    for (int i = 0; i < 5; i++) nums[len++] = nums2[i];
    show("拼接之后：", nums, len);

    // 排序列表
    sort(nums, nums + len);
    show("排序之后：", nums, len);
    return 0;
}
`,
  },
  '栈的常用操作': {
    group: '栈与队列',
    stdin: '',
    code: `#include <iostream>
#include <stack>
using namespace std;

/* 《Hello 算法》「栈」一节：后进先出。std::stack 只开了栈顶那一头，
   想遍历栈底得一个一个弹出来。 */
int main() {
    // 初始化栈
    stack<int> st;

    // 元素入栈
    st.push(1);
    st.push(3);
    st.push(2);
    st.push(5);
    st.push(4);

    // 访问栈顶元素
    int top = st.top();
    cout << "栈顶：" << top << endl;

    // 获取栈的长度 / 判断是否为空
    cout << "栈里 " << st.size() << " 个，空吗？" << (st.empty() ? "空" : "不空") << endl;

    // 元素出栈（没有返回值，想要就先 top 一下）
    cout << "出栈顺序：";
    while (!st.empty()) {
        cout << ' ' << st.top();
        st.pop();
    }
    cout << endl;
    cout << "出完还剩 " << st.size() << " 个" << endl;
    return 0;
}
`,
  },
  '队列的常用操作': {
    group: '栈与队列',
    stdin: '',
    code: `#include <iostream>
#include <queue>
using namespace std;

/* 《Hello 算法》「队列」一节：先进先出。std::queue 两头都封着，
   进队走 push，出队走 pop，中间插不了。 */
int main() {
    // 初始化队列
    queue<int> que;

    // 元素入队
    que.push(1);
    que.push(3);
    que.push(2);
    que.push(5);
    que.push(4);

    // 访问队首元素
    cout << "队首：" << que.front() << endl;
    cout << "队尾：" << que.back() << endl;

    // 获取队列的长度 / 判断是否为空
    cout << "队列里 " << que.size() << " 个，空吗？" << (que.empty() ? "空" : "不空") << endl;

    // 元素出队
    cout << "出队顺序：";
    while (!que.empty()) {
        cout << ' ' << que.front();
        que.pop();
    }
    cout << endl;
    return 0;
}
`,
  },
  '双向队列的常用操作': {
    group: '栈与队列',
    stdin: '',
    code: `#include <iostream>
#include <deque>
using namespace std;

/* 《Hello 算法》「双向队列」一节：两头都能进出，既能当队列也能当栈。 */
int main() {
    // 初始化双向队列
    deque<int> deq;

    // 元素入队
    deq.push_back(2);   // 添加至队尾
    deq.push_back(5);
    deq.push_back(4);
    deq.push_front(3);  // 添加至队首
    deq.push_front(1);

    // 访问元素
    cout << "队首：" << deq.front() << " 队尾：" << deq.back() << endl;

    // 获取双向队列的长度 / 判断是否为空
    cout << "长度 " << deq.size() << "，空吗？" << (deq.empty() ? "空" : "不空") << endl;

    // 元素出队
    int popFront = deq.front(); deq.pop_front();  // 队首元素出队
    int popBack = deq.back();  deq.pop_back();    // 队尾元素出队
    cout << "弹出队首 " << popFront << "、队尾 " << popBack << "，剩下：";
    for (int x : deq) cout << ' ' << x;
    cout << endl;
    return 0;
}
`,
  },
  '优先队列（大顶堆 / 小顶堆）': {
    group: '堆',
    stdin: '',
    code: `#include <iostream>
using namespace std;

/* 《Hello 算法》「堆」一节：堆就是「一个数组 + 一套上下沉的规则」。
   书里用 priority_queue（底下是 vector），这里改成普通数组自己实现，
   顺便看清「入堆上浮 / 出堆下沉」到底动的是哪几个格子。 */
const int CAP = 32;
int heap[CAP];                    // 堆顶在 [0]，元素个数记在 hn
int hn = 0;
bool isMin = false;               // false = 大顶堆

// 「更好」是指更该待在堆顶的那个
bool better(int a, int b) { return isMin ? a < b : a > b; }

// 下沉：和两个孩子里更好的那个换位，一路上换到底
void siftDown(int i) {
    while (true) {
        int l = 2 * i + 1, r = 2 * i + 2, s = i;
        if (l < hn && better(heap[l], heap[s])) s = l;
        if (r < hn && better(heap[r], heap[s])) s = r;
        if (s == i) break;
        int t = heap[i]; heap[i] = heap[s]; heap[s] = t;
        i = s;
    }
}

// 元素入堆：先塞到末尾，再一路上浮
void push(int x) {
    int i = hn++;
    heap[i] = x;
    while (i > 0) {
        int p = (i - 1) / 2;
        if (!better(heap[i], heap[p])) break;
        int t = heap[p]; heap[p] = heap[i]; heap[i] = t;
        i = p;
    }
}

// 堆顶元素出堆：把堆顶换到末尾，末尾那个再下沉回坑里
void pop() {
    if (hn == 0) return;
    heap[0] = heap[--hn];
    siftDown(0);
}

int top() { return heap[0]; }
bool empty() { return hn == 0; }
int size() { return hn; }

// 输入列表并建堆：从最后一个非叶子节点开始逐个下沉
void buildHeap(const int a[], int n) {
    hn = n;
    for (int i = 0; i < n; i++) heap[i] = a[i];
    for (int i = n / 2 - 1; i >= 0; i--) siftDown(i);
}

int main() {
    isMin = false;                       // 先玩大顶堆

    // 元素入堆
    push(1);
    push(3);
    push(2);
    push(5);
    push(4);

    // 获取堆顶元素
    int peek = top(); // 5
    cout << "堆顶元素：" << peek << endl;

    // 获取堆大小 / 判断堆是否为空
    cout << "堆里 " << size() << " 个，空吗？" << (empty() ? "空" : "不空") << endl;

    // 堆顶元素出堆，出堆元素会形成一个从大到小的序列
    cout << "出堆顺序：";
    while (!empty()) {
        cout << ' ' << top();
        pop();
    }
    cout << endl;

    // 输入列表并建堆
    int input[5] = {1, 3, 2, 5, 4};
    isMin = true;                        // 换成小顶堆
    buildHeap(input, 5);
    cout << "小顶堆堆顶：" << top() << endl;
    return 0;
}
`,
  },
  '哈希表：增删查与遍历': {
    group: '哈希',
    stdin: '',
    code: `#include <iostream>
#include <unordered_map>
#include <algorithm>
using namespace std;

/* 《Hello 算法》「哈希表」一节：键值对存进去，按键查回来。
   unordered_map 不保证遍历顺序，下面先把键排好序再打印，
   这样每次运行的输出都一样，便于对着看。 */
int main() {
    // 初始化哈希表
    unordered_map<int, string> hmap;

    // 添加操作：在哈希表中添加键值对 (key, value)
    hmap[12836] = "小哈";
    hmap[15937] = "小啰";
    hmap[16750] = "小算";
    hmap[13276] = "小法";
    hmap[10583] = "小鸭";
    cout << "放进去 " << hmap.size() << " 项" << endl;

    // 查询操作：向哈希表中输入键 key，得到值 value
    cout << "查 15937 -> " << hmap[15937] << endl;

    // 注意：C++ 的 operator[] 查不到会顺手插一个空值进去
    cout << "查 99999 -> [" << hmap[99999] << "]（空串），"
         << "可表里已经有 " << hmap.size() << " 项了" << endl;

    // 只想查不想插，用 find
    auto it = hmap.find(77777);
    cout << "用 find 查 77777：" << (it == hmap.end() ? "没找到" : it->second)
         << "，表里还是 " << hmap.size() << " 项" << endl;

    // 删除操作：在哈希表中删除键值对 (key, value)
    hmap.erase(10583);
    hmap.erase(99999);
    cout << "删掉 10583 和 99999 之后还有 " << hmap.size() << " 项" << endl;

    // 遍历哈希表：遍历键值对 key->value
    // unordered_map 不保证遍历顺序，先把键收集到一个数组里排好序，
    // 这样每次运行的输出都一样，便于对着看
    int keys[16];
    int keyCount = 0;
    for (auto kv : hmap) keys[keyCount++] = kv.first;
    sort(keys, keys + keyCount);
    for (int i = 0; i < keyCount; i++) cout << "  " << keys[i] << " -> " << hmap[keys[i]] << endl;
    return 0;
}
`,
  },
  '内置哈希函数 hash()': {
    group: '哈希',
    stdin: '',
    code: `#include <iostream>
#include <string>
using namespace std;

/* 《Hello 算法》「哈希算法」一节：std::hash 只给基本类型提供哈希值，
   数组和自定义类型要自己实现。哈希值是散列出来的索引，不是身份标识，
   标准也没规定具体算法——换个实现，同一个值的哈希结果就变了。 */
int main() {
    int num = 3;
    size_t hashNum = hash<int>()(num);
    cout << "整数 3 的哈希值为 " << hashNum << endl;

    bool bol = true;
    size_t hashBol = hash<bool>()(bol);
    cout << "布尔量 true 的哈希值为 " << hashBol << endl;

    double dec = 3.14159;
    size_t hashDec = hash<double>()(dec);
    cout << "小数 3.14159 的哈希值为 " << hashDec << endl;

    string str = "Hello";
    size_t hashStr = hash<string>()(str);
    cout << "字符串 Hello 的哈希值为 " << hashStr << endl;

    // 在 C++ 中，内置 std::hash() 仅提供基本数据类型的哈希值计算
    // 数组、对象的哈希值计算需要自行实现
    cout << endl;
    cout << "注意：哈希值只配当哈希表的索引用，" << endl;
    cout << "判断两个对象是不是同一个，要比内容，不是比哈希值。" << endl;
    return 0;
}
`,
  },
  '二叉树：初始化与节点插入删除': {
    group: '树',
    stdin: '',
    code: `#include <iostream>
using namespace std;

/* 《Hello 算法》「二叉树」一节：节点由「值 + 左孩子 + 右孩子」组成。
   插入就是在父子之间插一个节点，删除就是把孩子接到父亲那边。 */
struct TreeNode {
    int val;          // 节点值
    TreeNode *left;   // 左子节点指针
    TreeNode *right;  // 右子节点指针
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

// 中序遍历：左 -> 根 -> 右，出来就是升序
void printTree(TreeNode *node) {
    if (node == nullptr) return;
    printTree(node->left);
    cout << node->val << ' ';
    printTree(node->right);
}

int main() {
    // 初始化二叉树
    TreeNode* n1 = new TreeNode(1);
    TreeNode* n2 = new TreeNode(2);
    TreeNode* n3 = new TreeNode(3);
    TreeNode* n4 = new TreeNode(4);
    TreeNode* n5 = new TreeNode(5);
    // 构建节点之间的引用（指针）
    n1->left = n2;
    n1->right = n3;
    n2->left = n4;
    n2->right = n5;

    cout << "中序遍历：";
    printTree(n1);
    cout << endl;

    // 插入与删除节点
    TreeNode* P = new TreeNode(0);
    // 在 n1 -> n2 中间插入节点 P
    n1->left = P;
    P->left = n2;
    cout << "插入 0 之后中序遍历：";
    printTree(n1);
    cout << endl;

    // 删除节点 P
    n1->left = n2;
    cout << "删掉 0 之后中序遍历：";
    printTree(n1);
    cout << endl;

    // 释放内存
    delete P;
    delete n1; delete n2; delete n3; delete n4; delete n5;
    return 0;
}
`,
  },
  '二叉树的数组表示': {
    group: '树',
    stdin: '',
    code: `#include <iostream>
#include <climits>
using namespace std;

/* 《Hello 算法》「二叉树的数组表示」：二叉树摊平成一个数组，
   下标 i（从 0 起）的左孩子是 2i+1、右孩子是 2i+2，空位用 INT_MAX 标记。
   省掉了指针，但只对完全二叉树天然合适。 */
const int N = 15;

int main() {
    // 使用 int 最大值 INT_MAX 标记空位
    int tree[N] = {1, 2, 3, 4, INT_MAX, 6, 7, 8, 9, INT_MAX, INT_MAX, 12, INT_MAX, INT_MAX, 15};

    cout << "下标 -> 值（INT_MAX 是空位）：" << endl;
    for (int i = 0; i < N; i++) {
        cout << "  [" << i << "] ";
        if (tree[i] == INT_MAX) {
            cout << "空" << endl;
            continue;
        }
        cout << tree[i];
        int l = 2 * i + 1, r = 2 * i + 2;
        if (l < N && tree[l] != INT_MAX)
            cout << "  左孩子 [" << l << "] = " << tree[l];
        if (r < N && tree[r] != INT_MAX)
            cout << "  右孩子 [" << r << "] = " << tree[r];
        cout << endl;
    }
    return 0;
}
`,
  },
  'AVL 树：节点、高度与平衡因子': {
    group: '树',
    stdin: '',
    code: `#include <iostream>
using namespace std;

/* 《Hello 算法》「AVL 树」一节：AVL 树要求每个节点的左右子树高度差不超过 1，
   插进去发现失衡就旋转（左边高就右旋，右边高就左旋）。
   这里给出节点定义、节点高度和平衡因子，再拿一棵一路插左边的树算一遍，
   看看它是从哪一层开始失衡的。 */
struct TreeNode {
    int val{};          // 节点值
    int height = 0;     // 节点高度
    TreeNode *left{};   // 左子节点
    TreeNode *right{};  // 右子节点
    TreeNode() = default;
    explicit TreeNode(int x) : val(x) {}
};

// 节点高度
int height(TreeNode* node) {
    if (node == nullptr) return 0;
    return node->height;
}

// 节点平衡因子 = 左子树高度 - 右子树高度
int balanceFactor(TreeNode* node) {
    if (node == nullptr) return 0;
    return height(node->left) - height(node->right);
}

// 更新高度：孩子的高度得先算好，所以自底向上
void updateHeight(TreeNode* node) {
    if (node == nullptr) return;
    int l = height(node->left), r = height(node->right);
    node->height = (l > r ? l : r) + 1;
}

void updateAll(TreeNode* node) {
    if (node == nullptr) return;
    updateAll(node->left);
    updateAll(node->right);
    updateHeight(node);
}

void printTree(TreeNode* node, int depth = 0) {
    if (node == nullptr) return;
    printTree(node->right, depth + 1);
    for (int i = 0; i < depth; i++) cout << "    ";
    cout << node->val << "（高 " << node->height
         << "，平衡因子 " << balanceFactor(node)
         << (balanceFactor(node) > 1 ? " ← 失衡，该右旋了" : "") << "）" << endl;
    printTree(node->left, depth + 1);
}

int main() {
    TreeNode* n1 = new TreeNode(1);
    TreeNode* n2 = new TreeNode(2);
    TreeNode* n3 = new TreeNode(3);
    TreeNode* n4 = new TreeNode(4);
    n1->left = n2; n2->left = n3; n3->left = n4;

    updateAll(n1);
    printTree(n1);

    cout << endl << "平衡因子绝对值超过 1 的节点就是失衡节点，" << endl;
    cout << "上面这棵树一路插到左边，失衡就从 2 那层开始了。" << endl;

    delete n1; delete n2; delete n3; delete n4;
    return 0;
}
`,
  },
  '回溯算法框架': {
    group: '回溯',
    stdin: '',
    code: `#include <iostream>
using namespace std;

/* 《Hello 算法》「回溯算法」一节：框架本身是空的，只有四步——
   判断是否为解、遍历所有选择、剪枝、尝试与回退。
   下面拿「从数组里挑出和为 target 的子集」把它填起来，
   四个函数正好对应框架里的四行。全部用普通数组：
   待选数组、已选下标、答案表，都是定长的。 */
const int MAXN = 8;                   // 待选数组 / 已选下标的上限
const int MAXS = 64;                  // 最多记多少个解

struct State {
    int nums[MAXN];                   // 待选数组
    int numLen = 0;
    int path[MAXN];                   // 已经选中的下标
    int pathLen = 0;
    int sum = 0;                      // 已选元素之和
    int target = 0;
};

int res[MAXS][MAXN];                  // 每个解存「选中的元素」
int resLen[MAXS];
int resCount = 0;

// 判断是否为解
bool isSolution(const State& s) { return s.sum == s.target; }

// 记录解
void recordSolution(const State& s) {
    for (int i = 0; i < s.pathLen; i++) res[resCount][i] = s.nums[s.path[i]];
    resLen[resCount] = s.pathLen;
    resCount++;
}

// 剪枝：下标必须递增，否则同一个组合会被找到许多次
bool isValid(const State& s, int idx) {
    return s.pathLen == 0 || idx > s.path[s.pathLen - 1];
}

// 尝试：做出选择，更新状态
void makeChoice(State& s, int idx) {
    s.path[s.pathLen++] = idx;
    s.sum += s.nums[idx];
}

// 回退：撤销选择，恢复到之前的状态
void undoChoice(State& s, int idx) {
    s.sum -= s.nums[idx];
    s.pathLen--;
}

// 回溯算法框架
void backtrack(State *state, int *choices, int choiceCount) {
    // 判断是否为解
    if (isSolution(*state)) {
        // 记录解
        recordSolution(*state);
        // 不再继续搜索
        return;
    }
    // 遍历所有选择
    for (int i = 0; i < choiceCount; i++) {
        int idx = choices[i];
        // 剪枝：判断选择是否合法
        if (isValid(*state, idx)) {
            // 尝试：做出选择，更新状态
            makeChoice(*state, idx);
            backtrack(state, choices, choiceCount);
            // 回退：撤销选择，恢复到之前的状态
            undoChoice(*state, idx);
        }
    }
}

int main() {
    State st;
    int arr[4] = {3, 4, 5, 6};
    for (int i = 0; i < 4; i++) st.nums[i] = arr[i];
    st.numLen = 4;
    st.target = 9;
    int choices[4] = {0, 1, 2, 3};
    backtrack(&st, choices, 4);

    cout << "从 {3,4,5,6} 里挑和为 " << st.target << " 的子集：" << endl;
    for (int i = 0; i < resCount; i++) {
        cout << "  ";
        for (int k = 0; k < resLen[i]; k++) cout << (k ? " + " : "") << res[i][k];
        cout << endl;
    }
    cout << "共 " << resCount << " 种" << endl;
    return 0;
}
`,
  },
  '时间复杂度各阶对照': {
    group: '复杂度',
    stdin: '',
    code: `#include <iostream>
#include <iomanip>
using namespace std;

/* 《Hello 算法》「时间复杂度」一节：把同一个 n 丢给不同阶的算法，
   看操作次数怎么长。次数是算出来的，不是真跑出来的——
   真跑 O(n!) 到 n=20 要 20! ≈ 2.4e18 次，没人等得起。 */
long long ops_const(int n) { return 1; }
long long ops_linear(int n) { return n; }
long long ops_quad(int n)   { return 1LL * n * n; }
long long ops_log(int n)    { int c = 0; while ((1LL << c) <= n) ++c; return c; }
long long ops_nlogn(int n)  { return 1LL * n * ops_log(n); }
long long ops_exp(int n)    { return 1LL << n; }
long long ops_fact(int n)   { long long r = 1; for (int i = 2; i <= n; ++i) r *= i; return r; }

int main() {
    cout << setw(4) << "n" << setw(10) << "O(1)" << setw(10) << "O(n)" << setw(12) << "O(n^2)"
         << setw(12) << "O(log n)" << setw(14) << "O(n log n)" << setw(14) << "O(2^n)" << setw(24) << "O(n!)" << endl;
    for (int n : {10, 20}) {
        cout << setw(4) << n
             << setw(10) << ops_const(n)
             << setw(10) << ops_linear(n)
             << setw(12) << ops_quad(n)
             << setw(12) << ops_log(n)
             << setw(14) << ops_nlogn(n)
             << setw(14) << ops_exp(n)
             << setw(24) << ops_fact(n)
             << endl;
    }
    cout << endl << "n 从 10 翻到 20（一倍的 n），操作次数慢了几倍：" << endl;
    cout << "  O(1)     不变" << endl;
    cout << "  O(n)     " << ops_linear(20) / ops_linear(10) << " 倍" << endl;
    cout << "  O(n^2)   " << ops_quad(20) / ops_quad(10) << " 倍" << endl;
    cout << "  O(2^n)   " << ops_exp(20) / ops_exp(10) << " 倍" << endl;
    cout << "  O(n!)    " << ops_fact(20) / ops_fact(10) << " 倍" << endl;
    return 0;
}
`,
  },
  '空间复杂度：循环与递归': {
    group: '复杂度',
    stdin: '',
    code: `#include <iostream>
using namespace std;

/* 《Hello 算法》「空间复杂度」一节：循环里的临时变量用完就还，
   递归每多调一层就多占一个栈帧，深 n 层就是 O(n)。 */
int func() {
    // 执行某些操作
    return 0;
}

// 循环的空间复杂度为 O(1)
void loop(int n) {
    for (int i = 0; i < n; i++) {
        func();
    }
}

// 递归的空间复杂度为 O(n)
int deepest = 0;
int recur(int n) {
    if (n == 1) return 1;
    int r = recur(n - 1);
    if (n > deepest) deepest = n;    // 一路回溯上来，记下最深的一层
    return r;
}

int main() {
    loop(1000000);
    cout << "循环跑完 1000000 次：栈帧始终只有一个，O(1)" << endl;

    deepest = 0;
    recur(500);
    cout << "递归 500 层：最深用到第 " << deepest << " 层栈帧，O(n)" << endl;
    cout << "（栈有上限：递归再深就爆栈了，工具条上那个「栈大小」就是给它的）" << endl;

    // 变量占多少空间也分 O(1) 和 O(n)
    const int a = 0;             // 暂存数据（常量）
    int b = 0;                   // 暂存数据（变量）
    int c[10000];                // 长度固定，永远 O(1)
    for (int i = 0; i < 10000; i++) c[i] = 0;
    const int n = 10000;
    int* d = new int[n];         // 长度随 n 变，就是 O(n)
    for (int i = 0; i < n; i++) d[i] = 0;
    cout << "常量 a、变量 b、固定长度 10000 的数组 c：O(1)" << endl;
    cout << "长度随 n 增长的数组 d：O(n)" << endl;
    cout << "a=" << a << " b=" << b << " c[0]=" << c[0] << " d[9999]=" << d[9999] << endl;
    delete[] d;
    return 0;
}
`,
  },
  '多种基本数据类型初始化数组': {
    group: '基础',
    stdin: '',
    code: `#include <iostream>
using namespace std;

/* 《Hello 算法》「基本数据类型」一节：数组的元素类型是定死的，
   想放什么类型，声明的时候就得说清楚。 */
int main() {
    // 使用多种基本数据类型来初始化数组
    int numbers[5];
    float decimals[5];
    char characters[5];
    bool bools[5];

    for (int i = 0; i < 5; i++) {
        numbers[i] = i + 1;
        decimals[i] = i + 0.5f;
        characters[i] = 'a' + i;
        bools[i] = (i % 2 == 0);
    }

    cout << "int   ：";
    for (int x : numbers) cout << ' ' << x;
    cout << endl;
    cout << "float ：";
    for (float x : decimals) cout << ' ' << x;
    cout << endl;
    cout << "char  ：";
    for (char c : characters) cout << ' ' << c;
    cout << endl;
    cout << "bool  ：";
    for (bool b : bools) cout << ' ' << (b ? "true" : "false");
    cout << endl;

    cout << endl << "注意：char 存的是编码，不是字符本身。" << endl;
    cout << "characters[0] 的值是 " << int(characters[0]) << "（'a' 的编码）" << endl;
    return 0;
}
`,
  },
  /* ------------------------------------------------------------------ */
  /* 下面这批补齐经典算法教程的算法主线：各章教程里都要讲、又适合用      */
  /* 普通数组写清楚的算法。参考 OI Wiki、GeeksforGeeks DSA Roadmap、     */
  /* VisuAlgo 章节表、《Hello 算法》与国内数据结构教材的目录；           */
  /* C++ 侧一律定长数组 + 下标，不用 vector / queue / map / new，        */
  /* 结构体数组、游标数组、二维数组都算数组实现。Python 侧逐条对照。     */
  /* ------------------------------------------------------------------ */
  '选择排序 + 希尔排序': {
    group: '排序',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

void show(const char* tag, const int a[], int n) {
    printf("%s", tag);
    for (int i = 0; i < n; ++i) printf("%d ", a[i]);
    printf("\\n");
}

/* 选择排序：每趟从 [i,n) 里挑最小的换到 i。交换最多 n-1 次，
   但比较次数固定 n(n-1)/2，跟数据有没有序无关。 */
void selectionSort(int a[], int n) {
    int cmp = 0, swp = 0;
    for (int i = 0; i < n - 1; ++i) {
        int m = i;
        for (int j = i + 1; j < n; ++j) { ++cmp; if (a[j] < a[m]) m = j; }
        if (m != i) { int t = a[i]; a[i] = a[m]; a[m] = t; ++swp; }
    }
    printf("选择排序：比较 %d 次，交换 %d 次\\n  ", cmp, swp);
    show("", a, n);
}

/* 希尔排序：按 gap 分组做插入排序，gap 逐次减半，最后一趟 gap=1。
   大步长先让数据「大致有序」，最后一趟的搬移就少得多。 */
void shellSort(int a[], int n) {
    int cmp = 0, mv = 0;
    for (int gap = n / 2; gap > 0; gap /= 2) {
        for (int i = gap; i < n; ++i) {
            int x = a[i], j = i;
            while (j >= gap) {
                ++cmp;
                if (a[j - gap] <= x) break;
                a[j] = a[j - gap]; ++mv; j -= gap;   // 同组内后移 gap 位
            }
            a[j] = x; ++mv;
        }
        printf("  gap=%d：", gap); show("", a, n);
    }
    printf("希尔排序：比较 %d 次，移动 %d 次\\n", cmp, mv);
}

int main() {
    const int raw[10] = {9, 5, 1, 8, 3, 7, 2, 6, 4, 0};
    int a[10], b[10];
    memcpy(a, raw, sizeof(raw));
    memcpy(b, raw, sizeof(raw));
    show("原始数据：", raw, 10);
    selectionSort(a, 10);
    shellSort(b, 10);
    return 0;
}
`,
  },
  '堆排序（数组版建堆与下沉）': {
    group: '排序',
    stdin: '',
    code: `#include <cstdio>

/* 完全二叉树用数组存：下标 i 的孩子是 2i+1 / 2i+2，父亲是 (i-1)/2。
   不用指针、不用 priority_queue，堆排序只要一个 siftDown。 */
static int cmpCnt, swpCnt;

void siftDown(int a[], int root, int end) {          // 维护 [root,end) 的大顶堆
    while (2 * root + 1 < end) {
        int child = 2 * root + 1;
        ++cmpCnt;
        if (child + 1 < end && a[child + 1] > a[child]) ++child;
        ++cmpCnt;
        if (a[root] >= a[child]) break;
        int t = a[root]; a[root] = a[child]; a[child] = t;
        ++swpCnt;
        root = child;
    }
}

void heapSort(int a[], int n) {
    for (int i = n / 2 - 1; i >= 0; --i) siftDown(a, i, n);  // 自底向上建堆 O(n)
    printf("建堆完成（大顶堆）：");
    for (int i = 0; i < n; ++i) printf("%d ", a[i]);
    printf("\\n");
    for (int end = n - 1; end > 0; --end) {
        int t = a[0]; a[0] = a[end]; a[end] = t;     // 堆顶最大值换到末尾
        ++swpCnt;
        siftDown(a, 0, end);                          // 剩下 [0,end) 重新成堆
    }
}

int main() {
    int a[12] = {4, 10, 3, 5, 1, 8, 7, 2, 9, 6, 0, 11};
    printf("原始数据：");
    for (int i = 0; i < 12; ++i) printf("%d ", a[i]);
    printf("\\n");
    heapSort(a, 12);
    printf("排序结果：");
    for (int i = 0; i < 12; ++i) printf("%d ", a[i]);
    printf("\\n比较 %d 次，交换 %d 次；时间 O(n log n)，额外空间 O(1)\\n", cmpCnt, swpCnt);
    return 0;
}
`,
  },
  '计数排序 + 桶排序': {
    group: '排序',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* 非比较排序：值域小就数频次（计数排序），值域大但分布均匀就分桶
   （桶内再用插入排序）。两者都靠数组下标，复杂度能压到 O(n+k)。 */
void countingSort(const int a[], int out[], int n, int range) {
    int cnt[101];
    memset(cnt, 0, sizeof(cnt));
    for (int i = 0; i < n; ++i) ++cnt[a[i]];
    for (int v = 1; v <= range; ++v) cnt[v] += cnt[v - 1];   // 前缀和 = 该值的结束位置
    for (int i = n - 1; i >= 0; --i) out[--cnt[a[i]]] = a[i]; // 倒着放才稳定
}

void insertSort(int b[], int n) {
    for (int i = 1; i < n; ++i) {
        int x = b[i], j = i - 1;
        while (j >= 0 && b[j] > x) { b[j + 1] = b[j]; --j; }
        b[j + 1] = x;
    }
}

int main() {
    const int a[12] = {7, 3, 9, 1, 7, 5, 2, 8, 3, 6, 4, 0};
    int out[12];
    countingSort(a, out, 12, 9);
    printf("计数排序：");
    for (int i = 0; i < 12; ++i) printf("%d ", out[i]);
    printf("\\n（值域 0..9，重复值 3、7 的相对次序保持不变）\\n\\n");

    const int raw[12] = {29, 5, 71, 18, 44, 93, 36, 60, 12, 87, 51, 66};
    const int B = 5, W = 20;                  // 5 个桶：[0,20) [20,40) ...
    int bucket[5][12], len[5];
    for (int b = 0; b < B; ++b) len[b] = 0;
    for (int i = 0; i < 12; ++i) {
        int b = raw[i] / W;
        bucket[b][len[b]++] = raw[i];
    }
    printf("桶分布（每桶内先插入排序）：\\n");
    for (int b = 0; b < B; ++b) {
        insertSort(bucket[b], len[b]);
        printf("  桶 %d：", b);
        for (int i = 0; i < len[b]; ++i) printf("%d ", bucket[b][i]);
        printf("\\n");
    }
    printf("桶排序结果：");
    for (int b = 0; b < B; ++b)
        for (int i = 0; i < len[b]; ++i) printf("%d ", bucket[b][i]);
    printf("\\n");
    return 0;
}
`,
  },
  '基数排序（按位分桶）': {
    group: '排序',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* LSD 基数排序：从个位到最高位，每一位都做一次「稳定计数排序」。
   10 个桶用 cnt[10] 的前缀和表示结束位置，tmp[] 暂存一趟结果。 */
void radixSort(int a[], int n) {
    int tmp[20], cnt[10];
    int maxv = a[0];
    for (int i = 1; i < n; ++i) if (a[i] > maxv) maxv = a[i];
    for (int exp = 1; exp <= maxv; exp *= 10) {
        memset(cnt, 0, sizeof(cnt));
        for (int i = 0; i < n; ++i) ++cnt[(a[i] / exp) % 10];
        for (int d = 1; d < 10; ++d) cnt[d] += cnt[d - 1];
        for (int i = n - 1; i >= 0; --i)     // 倒序保证稳定
            tmp[--cnt[(a[i] / exp) % 10]] = a[i];
        memcpy(a, tmp, n * sizeof(int));
        printf("  按 10^%d 位分桶后：", exp == 1 ? 0 : (exp == 10 ? 1 : 2));
        for (int i = 0; i < n; ++i) printf("%d ", a[i]);
        printf("\\n");
    }
}

int main() {
    int a[12] = {170, 45, 75, 90, 2, 802, 24, 66, 8, 301, 123, 55};
    printf("原始数据：");
    for (int i = 0; i < 12; ++i) printf("%d ", a[i]);
    printf("\\n");
    radixSort(a, 12);
    printf("排序结果：");
    for (int i = 0; i < 12; ++i) printf("%d ", a[i]);
    printf("\\n复杂度 O(d(n+10))，d 是最大位数；每一趟都必须稳定。\\n");
    return 0;
}
`,
  },
  '双指针：去重 / 两数之和 / 反转': {
    group: '数组技巧',
    stdin: '',
    code: `#include <cstdio>

/* 有序数组上的三个双指针套路，全程只用下标，额外空间 O(1)。 */
int dedup(int a[], int n) {                  // 慢指针写、快指针读
    if (n == 0) return 0;
    int w = 1;
    for (int r = 1; r < n; ++r)
        if (a[r] != a[w - 1]) a[w++] = a[r];
    return w;
}

bool twoSum(const int a[], int n, int target, int& i, int& j) {
    int l = 0, r = n - 1;                    // 有序：和太大就右指针左移
    while (l < r) {
        int s = a[l] + a[r];
        if (s == target) { i = l; j = r; return true; }
        if (s < target) ++l; else --r;
    }
    return false;
}

void reverseArr(int a[], int n) {
    for (int l = 0, r = n - 1; l < r; ++l, --r) {
        int t = a[l]; a[l] = a[r]; a[r] = t;
    }
}

int main() {
    int a[12] = {1, 1, 2, 2, 2, 3, 4, 4, 5, 6, 6, 7};
    int k = dedup(a, 12);
    printf("去重后长度 %d：", k);
    for (int i = 0; i < k; ++i) printf("%d ", a[i]);
    printf("\\n");

    int i = -1, j = -1;
    if (twoSum(a, k, 9, i, j))
        printf("两数之和 9 -> 下标 %d 和 %d（%d + %d）\\n", i, j, a[i], a[j]);
    else
        printf("没找到和为 9 的一对\\n");

    reverseArr(a, k);
    printf("反转后：");
    for (int t = 0; t < k; ++t) printf("%d ", a[t]);
    printf("\\n");
    return 0;
}
`,
  },
  '前缀和与差分数组': {
    group: '数组技巧',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

int main() {
    const int n = 8;
    int a[8] = {2, 5, 1, 7, 3, 6, 4, 8};

    /* 前缀和：pre[i] = a[0..i-1] 之和，pre[0]=0，区间和相减即可。 */
    int pre[9];
    pre[0] = 0;
    for (int i = 0; i < n; ++i) pre[i + 1] = pre[i] + a[i];
    printf("前缀和：");
    for (int i = 0; i <= n; ++i) printf("%d ", pre[i]);
    printf("\\n  a[2..5] = pre[6]-pre[2] = %d\\n", pre[6] - pre[2]);
    printf("  a[0..7] = %d\\n\\n", pre[8] - pre[0]);

    /* 差分：d[i] = a[i]-a[i-1]，区间 [l,r] 加 v 只改 d[l] 和 d[r+1] 两处，
       最后前缀和还原。m 次区间加从 O(mn) 降到 O(m+n)。 */
    int d[10];
    memset(d, 0, sizeof(d));
    d[0] = a[0];
    for (int i = 1; i < n; ++i) d[i] = a[i] - a[i - 1];
    int ops[3][3] = {{1, 4, 10}, {3, 6, 5}, {0, 2, -2}};
    for (int k = 0; k < 3; ++k) {
        int l = ops[k][0], r = ops[k][1], v = ops[k][2];
        d[l] += v; d[r + 1] -= v;
        printf("  区间 [%d,%d] 加 %d\\n", l, r, v);
    }
    int cur = 0;
    printf("还原后的数组：");
    for (int i = 0; i < n; ++i) { cur += d[i]; printf("%d ", cur); }
    printf("\\n逐项核对：");
    for (int i = 0; i < n; ++i) {
        int v = a[i];
        for (int k = 0; k < 3; ++k)
            if (i >= ops[k][0] && i <= ops[k][1]) v += ops[k][2];
        printf("%d ", v);
    }
    printf("\\n");
    return 0;
}
`,
  },
  '滑动窗口：定长最大和与最短子数组': {
    group: '数组技巧',
    stdin: '',
    code: `#include <cstdio>

/* 滑动窗口：右端点一直往前走，左端点只在条件被破坏时跟着走，
   每个元素最多进一次、出一次，所以是 O(n)，不用枚举所有子数组。 */
int main() {
    const int n = 10;
    int a[10] = {2, 3, 5, 1, 6, 4, 8, 2, 7, 3};

    /* 定长 k=3 的最大和：先算头一个窗口，之后「加右端、减左端」 */
    const int k = 3;
    int sum = 0;
    for (int i = 0; i < k; ++i) sum += a[i];
    int best = sum, bestL = 0;
    printf("长度 %d 的窗口：", k);
    for (int r = k; r < n; ++r) {
        printf("[%d..%d]=%d ", r - k, r - 1, sum);
        sum += a[r] - a[r - k];
        if (sum > best) { best = sum; bestL = r - k + 1; }
    }
    printf("[%d..%d]=%d\\n", n - k, n - 1, sum);
    if (sum > best) { best = sum; bestL = n - k; }
    printf("最大窗口和 = %d（起点下标 %d）\\n\\n", best, bestL);

    /* 变长：和 >= target 的最短子数组，右端扩张、左端收缩 */
    const int target = 15;
    int l = 0, cur = 0, minLen = n + 1, ansL = -1;
    for (int r = 0; r < n; ++r) {
        cur += a[r];
        while (cur >= target) {
            if (r - l + 1 < minLen) { minLen = r - l + 1; ansL = l; }
            cur -= a[l++];
        }
    }
    printf("和 >= %d 的最短子数组：", target);
    if (ansL < 0) printf("不存在\\n");
    else {
        printf("长度 %d，起点 %d，元素 ", minLen, ansL);
        for (int i = ansL; i < ansL + minLen; ++i) printf("%d ", a[i]);
        printf("\\n");
    }
    return 0;
}
`,
  },
  '静态链表（游标数组实现）': {
    group: '数组技巧',
    stdin: '',
    code: `#include <cstdio>

/* 不用指针、不用 new：节点存在定长数组里，next[] 存的是「下一个节点的下标」，
   -1 表示空。这就是很多教材里说的「游标链表」，也是早期 FORTRAN/BASIC 的做法。 */
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

void printList(StaticList& L, int head) {
    for (int p = head; p != -1; p = L.next[p]) printf("%d -> ", L.val[p]);
    printf("NULL\\n");
}

int main() {
    StaticList L;
    int head = -1, tail = -1;
    for (int i = 0; i < 5; ++i) {       // 尾插建表
        int p = L.alloc(i * 10 + 1);
        if (head == -1) head = p; else L.next[tail] = p;
        tail = p;
    }
    printf("建好的链表："); printList(L, head);
    printf("节点都是数组下标，第一个节点下标 = %d，已用 %d 个\\n", head, L.used);

    /* 在值为 21 的节点后插入 99 */
    int p = L.alloc(99);
    for (int q = head; q != -1; q = L.next[q])
        if (L.val[q] == 21) { L.next[p] = L.next[q]; L.next[q] = p; break; }
    printf("21 后面插入 99："); printList(L, head);

    /* 删除值为 11 的节点，并把它归还空闲链 */
    int prev = -1;
    for (int q = head; q != -1; prev = q, q = L.next[q])
        if (L.val[q] == 11) {
            if (prev == -1) head = L.next[q]; else L.next[prev] = L.next[q];
            L.release(q);
            break;
        }
    printf("删除 11 之后："); printList(L, head);
    printf("已用节点 %d 个（删除的下标被回收复用）\\n", L.used);
    return 0;
}
`,
  },
  '二维数组：杨辉三角与螺旋遍历': {
    group: '数组技巧',
    stdin: '',
    code: `#include <cstdio>

int main() {
    /* 杨辉三角：每行首尾为 1，中间 = 上一行左肩 + 右肩。 */
    const int N = 7;
    int tri[7][7] = {};
    for (int i = 0; i < N; ++i) {
        tri[i][0] = tri[i][i] = 1;
        for (int j = 1; j < i; ++j) tri[i][j] = tri[i - 1][j - 1] + tri[i - 1][j];
    }
    printf("杨辉三角（第 n 行就是二项式系数）：\\n");
    for (int i = 0; i < N; ++i) {
        for (int s = 0; s < N - i; ++s) printf(" ");
        for (int j = 0; j <= i; ++j) printf("%3d ", tri[i][j]);
        printf("\\n");
    }
    printf("第 6 行之和 = %d = 2^6 = 64\\n\\n",
           tri[6][0] + tri[6][1] + tri[6][2] + tri[6][3] +
           tri[6][4] + tri[6][5] + tri[6][6]);

    /* 螺旋遍历：四个边界 top/bottom/left/right 往里缩，别重复走角上的格子。 */
    const int R = 4, C = 5;
    int m[4][5] = {{1, 2, 3, 4, 5},
                   {6, 7, 8, 9, 10},
                   {11, 12, 13, 14, 15},
                   {16, 17, 18, 19, 20}};
    int top = 0, bottom = R - 1, left = 0, right = C - 1;
    printf("4x5 矩阵螺旋顺序：");
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; ++c) printf("%d ", m[top][c]);
        ++top;
        for (int r = top; r <= bottom; ++r) printf("%d ", m[r][right]);
        --right;
        if (top <= bottom) {
            for (int c = right; c >= left; --c) printf("%d ", m[bottom][c]);
            --bottom;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; --r) printf("%d ", m[r][left]);
            ++left;
        }
    }
    printf("\\n一共 %d 个数，正好不重不漏\\n", R * C);
    return 0;
}
`,
  },
  '单调栈：下一个更大元素与最大矩形': {
    group: '栈与队列',
    stdin: '',
    code: `#include <cstdio>

/* 单调栈：栈里存下标，对应值保持单调。新元素把「比自己小/大」的栈顶
   全部弹出时，就正好找到了那些元素的第一个更大/更小值 —— 每个下标
   只进出栈一次，整体 O(n)。 */
int main() {
    const int n = 8;
    int a[8] = {4, 7, 3, 5, 2, 9, 6, 1};
    int st[16], nge[8];                   // nge[i] = 右边第一个更大的值

    int top = 0;
    for (int i = 0; i < n; ++i) nge[i] = -1;
    for (int i = 0; i < n; ++i) {
        while (top > 0 && a[st[top - 1]] < a[i]) nge[st[--top]] = a[i];
        st[top++] = i;
    }
    printf("数组：");
    for (int i = 0; i < n; ++i) printf("%d ", a[i]);
    printf("\\n下一个更大元素：");
    for (int i = 0; i < n; ++i) printf("%d ", nge[i]);
    printf("  （-1 表示右边没有更大的）\\n\\n");

    /* 柱状图最大矩形：单调递增栈，遇到矮柱子就弹栈，
       以弹出柱子的高度为矩形高、宽度 = 当前下标 - 新栈顶 - 1。 */
    int h[7] = {2, 1, 5, 6, 2, 3, 0};    // 末尾 0 是哨兵，逼着最后全部弹栈
    long long best = 0; int bestL = 0, bestW = 0, bestH = 0;
    top = 0;
    for (int i = 0; i < 7; ++i) {
        while (top > 0 && h[st[top - 1]] > h[i]) {
            int height = h[st[--top]];
            int l = top > 0 ? st[top - 1] + 1 : 0;
            int width = i - l;
            long long area = (long long)height * width;
            if (area > best) { best = area; bestL = l; bestW = width; bestH = height; }
        }
        st[top++] = i;
    }
    printf("柱状图：");
    for (int i = 0; i < 6; ++i) printf("%d ", h[i]);
    printf("\\n最大矩形面积 = %lld（高 %d x 宽 %d，从下标 %d 开始）\\n",
           best, bestH, bestW, bestL);
    return 0;
}
`,
  },
  '单调队列：滑动窗口最大值': {
    group: '栈与队列',
    stdin: '',
    code: `#include <cstdio>

/* 队头永远是当前窗口最大值的下标：入队前把队尾所有「不超过自己」的
   下标弹掉（它们既更旧又更小，永远不可能再当最大值），再把越界的
   队头弹掉。每个下标最多进出一次，O(n)，比每窗口扫一遍 O(nk) 快。 */
int main() {
    const int n = 10, k = 3;
    int a[10] = {4, 2, 8, 5, 1, 9, 3, 7, 6, 0};
    int q[16], head = 0, tail = 0;         // q[head..tail) 存下标

    printf("数组：");
    for (int i = 0; i < n; ++i) printf("%d ", a[i]);
    printf("\\n窗口大小 k=%d，最大值依次为：", k);
    for (int i = 0; i < n; ++i) {
        while (head < tail && a[q[tail - 1]] <= a[i]) --tail;
        q[tail++] = i;
        while (head < tail && q[head] <= i - k) ++head;  // 队头滑出窗口
        if (i >= k - 1) printf("%d ", a[q[head]]);
    }
    printf("\\n");

    /* 朴素做法对照：每窗口扫 k 个数，结果必须一致。 */
    printf("朴素 O(nk) 对照：");
    for (int i = k - 1; i < n; ++i) {
        int mx = a[i - k + 1];
        for (int j = i - k + 2; j <= i; ++j) if (a[j] > mx) mx = a[j];
        printf("%d ", mx);
    }
    printf("\\n");
    return 0;
}
`,
  },
  '数组栈：中缀转后缀并求值': {
    group: '栈与队列',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>
#include <cctype>

/* 两个数组当栈：op[] 存运算符，val[] 存操作数，不用 stack<>。
   shunting-yard：数字直接输出；运算符按优先级把栈顶弹到输出，
   直到遇到更低优先级或左括号；右括号弹到左括号为止。 */
int prec(char c) {
    if (c == '+' || c == '-') return 1;
    if (c == '*' || c == '/') return 2;
    return 0;
}

int main() {
    const char* expr = "12 + 3 * (8 - 6) / 2";
    char post[256]; int pn = 0;
    char op[128]; int top = 0;

    for (int i = 0; expr[i]; ++i) {
        char c = expr[i];
        if (c == ' ') continue;
        if (isdigit((unsigned char)c)) {           // 多位整数整体读出
            while (isdigit((unsigned char)expr[i])) post[pn++] = expr[i++];
            post[pn++] = ' ';
            --i;
        } else if (c == '(') {
            op[top++] = c;
        } else if (c == ')') {
            while (top > 0 && op[top - 1] != '(') post[pn++] = op[--top], post[pn++] = ' ';
            if (top > 0) --top;                    // 丢掉左括号
        } else {
            while (top > 0 && op[top - 1] != '(' && prec(op[top - 1]) >= prec(c))
                { post[pn++] = op[--top]; post[pn++] = ' '; }
            op[top++] = c;
        }
    }
    while (top > 0) { post[pn++] = op[--top]; post[pn++] = ' '; }
    post[pn] = 0;
    printf("中缀：%s\\n后缀：%s\\n", expr, post);

    /* 后缀求值：数字压 val[]，运算符弹两个再压回结果。 */
    int val[128], vn = 0;
    for (int i = 0; i < pn; ++i) {
        char c = post[i];
        if (c == ' ') continue;
        if (isdigit((unsigned char)c)) {
            int x = 0;
            while (isdigit((unsigned char)post[i])) x = x * 10 + (post[i++] - '0');
            val[vn++] = x;
            --i;
        } else {
            int b = val[--vn], a = val[--vn];
            int r = c == '+' ? a + b : c == '-' ? a - b : c == '*' ? a * b : a / b;
            val[vn++] = r;
        }
    }
    printf("求值结果 = %d（12 + 3*2/2 = 15）\\n", val[0]);
    return 0;
}
`,
  },
  '哈夫曼树与编码（数组建树）': {
    group: '树',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* 节点全放定长数组，用下标当「指针」：每次挑两个 parent==0 的最小权节点，
   合成一个新节点放进数组尾部。n 个叶子最终有 2n-1 个节点，不用 priority_queue。 */
struct Node { int w, parent, lch, rch; };

int main() {
    const int n = 6;
    const char ch[6] = {'A', 'B', 'C', 'D', 'E', 'F'};
    const int freq[6] = {45, 13, 12, 16, 9, 5};
    Node h[12];
    for (int i = 0; i < 12; ++i) { h[i].w = 0; h[i].parent = 0; h[i].lch = h[i].rch = -1; }
    for (int i = 0; i < n; ++i) h[i].w = freq[i];

    for (int k = n; k < 2 * n - 1; ++k) {
        int m1 = -1, m2 = -1;
        for (int i = 0; i < k; ++i) {
            if (h[i].parent != 0) continue;              // 已合并过的不再候选
            if (m1 < 0 || h[i].w < h[m1].w) { m2 = m1; m1 = i; }
            else if (m2 < 0 || h[i].w < h[m2].w) m2 = i;
        }
        h[k].w = h[m1].w + h[m2].w;
        h[k].lch = m1; h[k].rch = m2;
        h[m1].parent = h[m2].parent = k;
        printf("  合并 %d + %d = %d（新节点下标 %d）\\n", h[m1].w, h[m2].w, h[k].w, k);
    }
    int root = 2 * n - 2;
    printf("根节点下标 %d，总权值 WPL 下界 = %d\\n\\n", root, h[root].w);

    long long wpl = 0;
    printf("哈夫曼编码（左 0 右 1，从叶子往根倒推）：\\n");
    for (int i = 0; i < n; ++i) {
        char code[16]; int len = 0;
        for (int p = i; h[p].parent != 0; p = h[p].parent) {
            int par = h[p].parent;
            code[len++] = (h[par].lch == p) ? '0' : '1';   // 先按「叶子到根」记
        }
        code[len] = 0;
        for (int l = 0; l < len / 2; ++l) {                 // 翻过来才是「根到叶子」
            char t = code[l]; code[l] = code[len - 1 - l]; code[len - 1 - l] = t;
        }
        printf("  %c(%2d) : %-8s 长度 %d\\n", ch[i], freq[i], code, len);
        wpl += (long long)freq[i] * len;
    }
    printf("带权路径长度 WPL = %lld\\n", wpl);
    return 0;
}
`,
  },
  '数组邻接表（前向星）与迭代遍历': {
    group: '图',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* 不用 vector<vector<int>>：三条定长数组就是邻接表。
   head[u] 是 u 的第一条边下标，to[e]/nxt[e] 是终点和下一条边，-1 结尾。
   加边用头插法，这也是竞赛里俗称的「前向星」。 */
int main() {
    const int N = 7;
    int head[7], to[20], nxt[20], ecnt = 0;
    for (int i = 0; i < N; ++i) head[i] = -1;

    int edges[][2] = {{0,1},{0,2},{1,3},{1,4},{2,4},{2,5},{3,6},{4,6},{5,6}};
    const int m = 9;
    for (int i = 0; i < m; ++i) {         // 无向图存两个方向
        int u = edges[i][0], v = edges[i][1];
        for (int k = 0; k < 2; ++k) {
            to[ecnt] = (k == 0 ? v : u);
            nxt[ecnt] = head[k == 0 ? u : v];
            head[k == 0 ? u : v] = ecnt++;
        }
    }
    printf("前向星（head / to / nxt 三条数组）：\\n");
    for (int u = 0; u < N; ++u) {
        printf("  %d:", u);
        for (int e = head[u]; e != -1; e = nxt[e]) printf(" %d", to[e]);
        printf("\\n");
    }

    /* 迭代 DFS：数组当栈。注意入栈即标记，否则会重复入栈。 */
    int vis[7]; memset(vis, 0, sizeof(vis));
    int st[32], top = 0;
    st[top++] = 0; vis[0] = 1;
    printf("\\n迭代 DFS：");
    while (top > 0) {
        int u = st[--top];
        printf("%d ", u);
        for (int e = head[u]; e != -1; e = nxt[e]) {
            int v = to[e];
            if (!vis[v]) { vis[v] = 1; st[top++] = v; }
        }
    }

    /* BFS：数组当循环队列（head/tail 下标，不取模也够用）。 */
    memset(vis, 0, sizeof(vis));
    int q[32], qh = 0, qt = 0;
    q[qt++] = 0; vis[0] = 1;
    printf("\\n迭代 BFS：");
    while (qh < qt) {
        int u = q[qh++];
        printf("%d ", u);
        for (int e = head[u]; e != -1; e = nxt[e]) {
            int v = to[e];
            if (!vis[v]) { vis[v] = 1; q[qt++] = v; }
        }
    }
    printf("\\n");
    return 0;
}
`,
  },
  '邻接矩阵 + Floyd 全源最短路': {
    group: '图',
    stdin: '',
    code: `#include <cstdio>

int main() {
    const int N = 5, INF = 1000000;
    int d[5][5];
    for (int i = 0; i < N; ++i)
        for (int j = 0; j < N; ++j) d[i][j] = (i == j ? 0 : INF);
    int e[][3] = {{0,1,4},{0,2,1},{2,1,2},{1,3,1},{2,3,5},{3,4,3},{0,3,100}};
    for (int k = 0; k < 7; ++k) d[e[k][0]][e[k][1]] = e[k][2];

    /* Floyd：枚举中转点 k，d[i][j] = min(d[i][j], d[i][k] + d[k][j])。
       k 必须放在最外层，这样每轮 d[i][k]、d[k][j] 都已允许 {0..k-1} 作中转。 */
    int relax = 0;
    for (int k = 0; k < N; ++k)
        for (int i = 0; i < N; ++i)
            for (int j = 0; j < N; ++j)
                if (d[i][k] + d[k][j] < d[i][j]) {
                    d[i][j] = d[i][k] + d[k][j];
                    ++relax;
                }
    printf("Floyd 松弛 %d 次，最终距离矩阵（INF 记 -1）：\\n", relax);
    printf("      ");
    for (int j = 0; j < N; ++j) printf("%4d", j);
    printf("\\n");
    for (int i = 0; i < N; ++i) {
        printf("  %d:  ", i);
        for (int j = 0; j < N; ++j)
            printf("%4d", d[i][j] >= INF ? -1 : d[i][j]);
        printf("\\n");
    }
    printf("\\n0 -> 3 = %d（直达边是 100，绕 0->2->1->3 只要 4）\\n", d[0][3]);
    printf("0 -> 4 = %d\\n", d[0][4]);
    return 0;
}
`,
  },
  '拓扑排序（Kahn 数组队列）': {
    group: '图',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* Kahn 算法：入度为 0 的点入队，出队时把它的邻接点入度减一，
   新变成 0 的接着入队。若出队数 < 顶点数，说明图里有环。 */
int main() {
    const int N = 7;
    int edges[][2] = {{0,1},{0,2},{1,3},{2,3},{3,4},{2,5},{5,6},{4,6}};
    const int M = 8;
    int head[7], to[8], nxt[8], indeg[7];
    for (int i = 0; i < N; ++i) { head[i] = -1; indeg[i] = 0; }
    for (int i = 0; i < M; ++i) {
        int u = edges[i][0], v = edges[i][1];
        to[i] = v; nxt[i] = head[u]; head[u] = i;
        ++indeg[v];
    }
    printf("各点入度：");
    for (int i = 0; i < N; ++i) printf("%d ", indeg[i]);
    printf("\\n");

    int q[16], qh = 0, qt = 0, order[16], cnt = 0;
    for (int i = 0; i < N; ++i) if (indeg[i] == 0) q[qt++] = i;
    while (qh < qt) {
        int u = q[qh++];
        order[cnt++] = u;
        for (int e = head[u]; e != -1; e = nxt[e])
            if (--indeg[to[e]] == 0) q[qt++] = to[e];
    }
    printf("拓扑序：");
    for (int i = 0; i < cnt; ++i) printf("%d ", order[i]);
    printf("\\n出队 %d 个点，%s\\n", cnt, cnt == N ? "无环" : "有环（剩下的点构成环）");

    /* 再加一条 6->0 的边造环，看算法怎么停下来 */
    int indeg2[7] = {1, 1, 1, 2, 1, 1, 2};   // 原入度 + 6->0 让 0 也 +1
    qh = qt = cnt = 0;
    for (int i = 0; i < N; ++i) if (indeg2[i] == 0) q[qt++] = i;
    while (qh < qt) {
        int u = q[qh++];
        order[cnt++] = u;
        for (int e = head[u]; e != -1; e = nxt[e])
            if (--indeg2[to[e]] == 0) q[qt++] = to[e];
        if (u == 6) { if (--indeg2[0] == 0) q[qt++] = 0; }
    }
    printf("加一条 6->0 后只排出 %d 个点 -> 检测到环\\n", cnt);
    return 0;
}
`,
  },
  '最小生成树：Prim + Kruskal': {
    group: '图',
    stdin: '',
    code: `#include <cstdio>

struct Edge { int u, v, w; };

/* 并查集也是数组：fa[i] 存父节点下标，按 size 合并防退化。 */
int fa[8];
int find(int x) { while (fa[x] != x) { fa[x] = fa[fa[x]]; x = fa[x]; } return x; }
bool unite(int a, int b) {
    a = find(a); b = find(b);
    if (a == b) return false;
    fa[b] = a;
    return true;
}

int main() {
    const int N = 6, M = 9, INF = 1000000;
    Edge e[9] = {{0,1,4},{0,2,2},{1,2,1},{1,3,5},{2,3,8},
                 {2,4,10},{3,4,2},{3,5,6},{4,5,3}};

    /* Prim：从 0 号点长出一棵树，lowcost[v] 记当前树到 v 的最便宜边。 */
    int g[6][6];
    for (int i = 0; i < N; ++i)
        for (int j = 0; j < N; ++j) g[i][j] = INF;
    for (int k = 0; k < M; ++k) { g[e[k].u][e[k].v] = e[k].w; g[e[k].v][e[k].u] = e[k].w; }
    int low[6], in[6]; long long primCost = 0;
    for (int i = 0; i < N; ++i) { low[i] = g[0][i]; in[i] = 0; }
    in[0] = 1;
    printf("Prim 依次选边：\\n");
    for (int k = 1; k < N; ++k) {
        int v = -1;
        for (int i = 0; i < N; ++i) if (!in[i] && (v < 0 || low[i] < low[v])) v = i;
        printf("  0..%d 树接到 %d，边权 %d\\n", k - 1, v, low[v]);
        primCost += low[v]; in[v] = 1;
        for (int i = 0; i < N; ++i) if (!in[i] && g[v][i] < low[i]) low[i] = g[v][i];
    }
    printf("Prim 总权值 = %lld\\n\\n", primCost);

    /* Kruskal：边按权排序（这里数据少，手写选择排序），再用并查集跳过成环的边。 */
    Edge sorted[9];
    for (int i = 0; i < M; ++i) sorted[i] = e[i];
    for (int i = 0; i < M - 1; ++i) {
        int m = i;
        for (int j = i + 1; j < M; ++j) if (sorted[j].w < sorted[m].w) m = j;
        Edge t = sorted[i]; sorted[i] = sorted[m]; sorted[m] = t;
    }
    for (int i = 0; i < N; ++i) fa[i] = i;
    long long kruskalCost = 0; int used = 0;
    printf("Kruskal 依次选边：\\n");
    for (int k = 0; k < M && used < N - 1; ++k) {
        if (unite(sorted[k].u, sorted[k].v)) {
            printf("  %d-%d(%d)\\n", sorted[k].u, sorted[k].v, sorted[k].w);
            kruskalCost += sorted[k].w; ++used;
        }
    }
    printf("Kruskal 总权值 = %lld（应与 Prim 相等）\\n", kruskalCost);
    return 0;
}
`,
  },
  '散列表：开放定址线性探测': {
    group: '查找与字符串',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* 冲突不挂链，直接在表内往后找空位：h = (key + i) % CAP 线性探测，
   或 (key + i*i) % CAP 平方探测。删除要做墓碑标记，否则会截断探测链。
   状态：0 空 / 1 占用 / 2 已删除（墓碑）。 */
const int CAP = 11;
int keyTab[11], valTab[11], state[11];

int insertLinear(int k, int v) {
    int probes = 0;
    for (int i = 0; i < CAP; ++i) {
        int p = (k + i) % CAP;
        ++probes;
        if (state[p] == 1) { if (keyTab[p] == k) { valTab[p] = v; return probes; } continue; }
        keyTab[p] = k; valTab[p] = v; state[p] = 1;
        return probes;
    }
    return -1;                            // 表满
}

int findKey(int k, int& outV) {
    for (int i = 0; i < CAP; ++i) {
        int p = (k + i) % CAP;
        if (state[p] == 0) return -1;     // 遇到真空位就可以停
        if (state[p] == 1 && keyTab[p] == k) { outV = valTab[p]; return i + 1; }
    }
    return -1;
}

int main() {
    memset(state, 0, sizeof(state));
    int keys[7] = {12, 23, 34, 45, 56, 67, 78};   // 都 mod 11 容易撞车
    printf("插入（线性探测，CAP=%d）：\\n", CAP);
    for (int i = 0; i < 7; ++i) {
        int p = insertLinear(keys[i], keys[i] * 10);
        printf("  key=%2d h=%2d 探测 %d 次 -> 实际下标 %d\\n",
               keys[i], keys[i] % CAP, p, (keys[i] % CAP + p - 1) % CAP);
    }
    printf("\\n表内容：\\n");
    for (int i = 0; i < CAP; ++i)
        printf("  [%2d] %s\\n", i, state[i] == 1 ? "占用" : state[i] == 2 ? "墓碑" : "空");
    printf("\\n查找：\\n");
    for (int i = 0; i < 3; ++i) {
        int k = (i == 0 ? 34 : i == 1 ? 67 : 99), v = -1;
        int n = findKey(k, v);
        printf("  key=%d -> %s（探测 %d 次）\\n", k,
               n < 0 ? "查无此键" : "找到", n < 0 ? CAP : n);
    }
    return 0;
}
`,
  },
  'Trie 字典树（二维数组）': {
    group: '查找与字符串',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* 每个节点的 26 个孩子就是 nxt[节点号][字母]，-1 表示没有这条边。
   整棵树是一块静态二维数组，插查都是 O(串长)，和单词数量无关。 */
int nxt[64][26];
int isEnd[64], passCnt[64], nodes;

void initTrie() {
    memset(nxt, -1, sizeof(nxt));
    memset(isEnd, 0, sizeof(isEnd));
    memset(passCnt, 0, sizeof(passCnt));
    nodes = 1;                         // 0 号是根
}

void insertWord(const char* s) {
    int p = 0;
    for (int i = 0; s[i]; ++i) {
        int c = s[i] - 'a';
        if (nxt[p][c] == -1) nxt[p][c] = nodes++;
        p = nxt[p][c];
        ++passCnt[p];                 // 经过这个节点的单词数
    }
    isEnd[p] = 1;
}

int findWord(const char* s, int& passes) {
    int p = 0;
    for (int i = 0; s[i]; ++i) {
        int c = s[i] - 'a';
        if (nxt[p][c] == -1) return 0;
        p = nxt[p][c];
    }
    passes = passCnt[p];
    return isEnd[p];
}

int main() {
    initTrie();
    const char* words[6] = {"to", "tea", "ted", "ten", "in", "inn"};
    for (int i = 0; i < 6; ++i) insertWord(words[i]);
    printf("插入 6 个单词，共用 %d 个节点（前缀共享节点，所以远少于字母总数）\\n", nodes);
    printf("根节点的出边：");
    for (int c = 0; c < 26; ++c) if (nxt[0][c] != -1) printf("%c ", 'a' + c);
    printf("\\n\\n");

    const char* query[5] = {"tea", "te", "ten", "inn", "toe"};
    for (int i = 0; i < 5; ++i) {
        int passes = 0;
        int whole = findWord(query[i], passes);
        printf("  查 %-4s：%s，经过该前缀的单词 %d 个\\n", query[i],
               whole ? "是完整单词" : (passes > 0 ? "只是前缀/不存在" : "不存在"), passes);
    }
    printf("\\n注意 te 不是完整单词但 te 前缀下有 3 个单词，这正是前缀统计的用法。\\n");
    return 0;
}
`,
  },
  'Rabin-Karp 滚动哈希匹配': {
    group: '查找与字符串',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* 把字符串看成 131 进制数，窗口右移时「减掉最高位、乘 base、加新字符」
   就是 O(1) 的滚动哈希，不用每次重算整段。哈希相等后再逐字符核对，防碰撞。 */
typedef unsigned long long ULL;
const ULL BASE = 131;

int main() {
    const char* text = "abababcaabababcab";
    const char* pat  = "ababc";
    int n = (int)strlen(text), m = (int)strlen(pat);

    ULL pw = 1;
    for (int i = 1; i < m; ++i) pw *= BASE;      // BASE^(m-1)
    ULL hp = 0, ht = 0;
    for (int i = 0; i < m; ++i) { hp = hp * BASE + (unsigned char)pat[i]; ht = ht * BASE + (unsigned char)text[i]; }

    printf("文本：%s\\n模式：%s（长度 %d）\\n", text, pat, m);
    printf("RK 命中位置：");
    int verified = 0;
    for (int i = 0; i + m <= n; ++i) {
        if (ht == hp) {
            ++verified;                           // 哈希命中才逐字符核对
            int ok = 1;
            for (int j = 0; j < m; ++j) if (text[i + j] != pat[j]) { ok = 0; break; }
            if (ok) printf("%d ", i);
        }
        if (i + m < n) ht = (ht - (unsigned char)text[i] * pw) * BASE + (unsigned char)text[i + m];
    }
    printf("（哈希比对 %d 次）\\n朴素匹配：", verified);
    for (int i = 0; i + m <= n; ++i) {
        int ok = 1;
        for (int j = 0; j < m; ++j) if (text[i + j] != pat[j]) { ok = 0; break; }
        if (ok) printf("%d ", i);
    }
    printf("\\n两种结果应当一致；平均 O(n+m)，最坏仍 O(nm)。\\n");
    return 0;
}
`,
  },
  '01 背包（一维滚动数组）': {
    group: '动态规划',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* dp[c] = 容量 c 下的最大价值。容量必须倒着枚举：正序会让同一件物品
   被反复放进数组，那就变成完全背包了。 */
int main() {
    const int n = 5, CAP = 12;
    int w[5] = {2, 3, 4, 5, 9};
    int v[5] = {3, 4, 5, 8, 10};
    const char* name[5] = {"A", "B", "C", "D", "E"};
    int dp[13], pick[5][13];
    memset(dp, 0, sizeof(dp));
    memset(pick, 0, sizeof(pick));

    for (int i = 0; i < n; ++i)
        for (int c = CAP; c >= w[i]; --c) {
            int cand = dp[c - w[i]] + v[i];
            if (cand > dp[c]) { dp[c] = cand; pick[i][c] = 1; }
        }
    printf("容量 0..%d 的最优值：", CAP);
    for (int c = 0; c <= CAP; ++c) printf("%d ", dp[c]);
    printf("\\n最大价值 = %d\\n", dp[CAP]);

    /* 倒着按 pick 表还原选了哪些物品 */
    int c = CAP;
    printf("选取方案（倒推）：");
    for (int i = n - 1; i >= 0; --i) {
        if (pick[i][c]) { printf("%s ", name[i]); c -= w[i]; }
    }
    printf("\\n剩余容量 %d；总重 %d，总价值 %d\\n", c, CAP - c, dp[CAP]);
    return 0;
}
`,
  },
  '完全背包 + 零钱兑换': {
    group: '动态规划',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

int main() {
    const int CAP = 11;
    int coin[3] = {1, 3, 4};

    /* 完全背包：每件物品无限次，容量正着枚举，dp[c-w]+v 里已经含了本件物品。 */
    int best[12];
    memset(best, 0, sizeof(best));
    for (int i = 0; i < 3; ++i)
        for (int c = coin[i]; c <= CAP; ++c)
            if (best[c - coin[i]] + coin[i] > best[c])
                best[c] = best[c - coin[i]] + coin[i];
    printf("面额 {1,3,4}，凑出 0..%d 能凑到的最大金额：\\n  ", CAP);
    for (int c = 0; c <= CAP; ++c) printf("%d ", best[c]);
    printf("\\n  （每个值都等于金额本身说明都能凑齐）\\n\\n");

    /* 零钱兑换：求「最少几枚」，初始化成 INF，正序同样因为可无限取。 */
    const int INF = 1000000;
    int cnt[12], first[12];
    for (int c = 0; c <= CAP; ++c) { cnt[c] = INF; first[c] = -1; }
    cnt[0] = 0;
    for (int i = 0; i < 3; ++i)
        for (int c = coin[i]; c <= CAP; ++c)
            if (cnt[c - coin[i]] + 1 < cnt[c]) {
                cnt[c] = cnt[c - coin[i]] + 1;
                first[c] = coin[i];
            }
    printf("凑 11 的最少硬币数 = %d，方案：", cnt[CAP]);
    int c = CAP;
    while (c > 0) { printf("%d ", first[c]); c -= first[c]; }
    printf("\\ncnt 数组（最少枚数）：");
    for (int i = 0; i <= CAP; ++i) printf("%d ", cnt[i] >= INF ? -1 : cnt[i]);
    printf("\\n");
    return 0;
}
`,
  },
  '最长公共子序列 LCS（二维 dp）': {
    group: '动态规划',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* dp[i][j] = a 前 i 个与 b 前 j 个的 LCS 长度。
   相等就 dp[i-1][j-1]+1，不等就取上、左的较大者；
   填完表从右下角往回走即可还原一个具体的子序列。 */
int main() {
    const char* a = "ABCBDAB";
    const char* b = "BDCABA";
    int n = (int)strlen(a), m = (int)strlen(b);
    int dp[16][16];
    for (int i = 0; i <= n; ++i)
        for (int j = 0; j <= m; ++j) dp[i][j] = 0;

    for (int i = 1; i <= n; ++i)
        for (int j = 1; j <= m; ++j)
            dp[i][j] = (a[i - 1] == b[j - 1])
                     ? dp[i - 1][j - 1] + 1
                     : (dp[i - 1][j] > dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1]);

    printf("a = %s\\nb = %s\\nLCS 长度 = %d\\n", a, b, dp[n][m]);
    char lcs[16]; int k = 0, i = n, j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) { lcs[k++] = a[i - 1]; --i; --j; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) --i;
        else --j;
    }
    for (int l = 0; l < k / 2; ++l) { char t = lcs[l]; lcs[l] = lcs[k - 1 - l]; lcs[k - 1 - l] = t; }
    lcs[k] = 0;
    printf("还原出的一个 LCS = %s\\n\\n", lcs);
    printf("dp 表（行 a，列 b）：\\n    ");
    for (int j = 0; j < m; ++j) printf("%2c", b[j]);
    printf("\\n");
    for (int i = 0; i <= n; ++i) {
        printf("%2c ", i ? a[i - 1] : ' ');
        for (int j = 0; j <= m; ++j) printf("%2d", dp[i][j]);
        printf("\\n");
    }
    return 0;
}
`,
  },
  '最长上升子序列 LIS 与方案还原': {
    group: '动态规划',
    stdin: '',
    code: `#include <cstdio>

/* dp[i] = 以 a[i] 结尾的 LIS 长度，pre[i] 记它在序列里的前驱下标。
   O(n^2) 写法最容易看懂；下标链倒着走就能把一条具体方案打印出来。 */
int main() {
    const int n = 10;
    int a[10] = {2, 5, 1, 7, 3, 4, 8, 6, 9, 0};
    int dp[10], pre[10];
    for (int i = 0; i < n; ++i) { dp[i] = 1; pre[i] = -1; }

    int bestLen = 1, bestEnd = 0;
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < i; ++j)
            if (a[j] < a[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; pre[i] = j; }
        if (dp[i] > bestLen) { bestLen = dp[i]; bestEnd = i; }
    }
    printf("数组：");
    for (int i = 0; i < n; ++i) printf("%d ", a[i]);
    printf("\\n以各位置结尾的 LIS 长度：");
    for (int i = 0; i < n; ++i) printf("%d ", dp[i]);
    printf("\\nLIS 长度 = %d\\n", bestLen);

    int chain[16], k = 0;
    for (int p = bestEnd; p != -1; p = pre[p]) chain[k++] = a[p];
    printf("还原一条 LIS：");
    for (int t = k - 1; t >= 0; --t) printf("%d ", chain[t]);
    printf("\\n（严格上升，pre[] 存的是前驱下标）\\n");
    return 0;
}
`,
  },
  '编辑距离（二维 dp）': {
    group: '动态规划',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* dp[i][j] = 把 a 前 i 个字符变成 b 前 j 个字符的最少操作数，
   操作只有插入、删除、替换三种，每种代价 1。 */
int min3(int x, int y, int z) {
    int m = x < y ? x : y;
    return m < z ? m : z;
}

int main() {
    const char* a = "kitten";
    const char* b = "sitting";
    int n = (int)strlen(a), m = (int)strlen(b);
    int dp[16][16];
    for (int i = 0; i <= n; ++i) dp[i][0] = i;      // 全删
    for (int j = 0; j <= m; ++j) dp[0][j] = j;      // 全插
    for (int i = 1; i <= n; ++i)
        for (int j = 1; j <= m; ++j)
            dp[i][j] = (a[i - 1] == b[j - 1])
                     ? dp[i - 1][j - 1]
                     : 1 + min3(dp[i - 1][j],      // 删 a[i-1]
                                dp[i][j - 1],      // 插入 b[j-1]
                                dp[i - 1][j - 1]); // 替换

    printf("%s -> %s\\n编辑距离 = %d\\n", a, b, dp[n][m]);
    printf("（k->s 替换、e->i 替换、末尾插 g，共 3 步）\\n\\n");
    printf("dp 表：\\n    ");
    for (int j = 1; j <= m; ++j) printf("%2c", b[j - 1]);
    printf("\\n");
    for (int i = 0; i <= n; ++i) {
        printf("%2c ", i ? a[i - 1] : ' ');
        for (int j = 0; j <= m; ++j) printf("%2d", dp[i][j]);
        printf("\\n");
    }
    return 0;
}
`,
  },
  '全排列与组合（used 数组回溯）': {
    group: '回溯',
    stdin: '',
    code: `#include <cstdio>

/* 回溯 = 一层层做选择、递归、再撤销。used[] 标哪些元素已经选过，
   path[] 是当前的前缀。排列看顺序，组合强制下标递增以免重复。 */
void permute(int path[], int used[], int depth, int n, int& count) {
    if (depth == n) {
        if (count < 6) { printf("  "); for (int i = 0; i < n; ++i) printf("%d ", path[i]); printf("\\n"); }
        ++count;
        return;
    }
    for (int i = 0; i < n; ++i) {
        if (used[i]) continue;
        used[i] = 1; path[depth] = i + 1;
        permute(path, used, depth + 1, n, count);
        used[i] = 0;                     // 撤销选择，回到上一层
    }
}

void combine(int path[], int depth, int start, int n, int k, int& count) {
    if (depth == k) {
        if (count < 6) { printf("  "); for (int i = 0; i < k; ++i) printf("%d ", path[i]); printf("\\n"); }
        ++count;
        return;
    }
    for (int i = start; i <= n; ++i) {   // 只往后取，组合就不重复
        path[depth] = i;
        combine(path, depth + 1, i + 1, n, k, count);
    }
}

int main() {
    int path[8], used[8] = {0};
    int count = 0;
    printf("{1,2,3} 的全排列（只列前 6 个）：\\n");
    permute(path, used, 0, 3, count);
    printf("共 %d 个 = 3!\\n\\n", count);

    count = 0;
    printf("从 {1,2,3,4,5} 取 3 个的组合（只列前 6 个）：\\n");
    combine(path, 0, 1, 5, 3, count);
    printf("共 %d 个 = C(5,3) = 10\\n", count);
    return 0;
}
`,
  },
  '八皇后（列与对角线标记数组）': {
    group: '回溯',
    stdin: '',
    code: `#include <cstdio>

/* 逐行放皇后：col[c] 管列，diag1[row+c]、diag2[row-c+N] 管两条对角线。
   三个布尔数组就是全部冲突检测，不用二维棋盘扫来扫去。 */
const int N = 8;
int col[8], diag1[16], diag2[16], pos[8];
int solutions, shown;

void dfs(int row) {
    if (row == N) {
        ++solutions;
        if (shown < 3) {
            printf("  解 %d：", solutions);
            for (int r = 0; r < N; ++r) printf("%d ", pos[r] + 1);
            printf("（每项是第 r 行皇后所在的列）\\n");
            ++shown;
        }
        return;
    }
    for (int c = 0; c < N; ++c) {
        int d1 = row + c, d2 = row - c + N;
        if (col[c] || diag1[d1] || diag2[d2]) continue;
        col[c] = diag1[d1] = diag2[d2] = 1;
        pos[row] = c;
        dfs(row + 1);
        col[c] = diag1[d1] = diag2[d2] = 0;
    }
}

int main() {
    dfs(0);
    printf("八皇后共有 %d 个解（N=%d）\\n", solutions, N);
    printf("时间复杂度是搜索树规模，靠三个标记数组把每步冲突判断压到 O(1)\\n");
    return 0;
}
`,
  },
  '贪心：活动选择与找零钱': {
    group: '贪心',
    stdin: '',
    code: `#include <cstdio>

struct Act { int s, e, id; };

int main() {
    /* 活动选择：按结束时间升序，能塞就塞。结束越早给后面留的空间越多，
       这个「最早结束」的贪心对区间调度是最优的。 */
    Act a[6] = {{1,3,1},{2,5,2},{3,7,3},{0,4,4},{5,9,5},{8,10,6}};
    for (int i = 0; i < 5; ++i) {          // 手写选择排序，按结束时间
        int m = i;
        for (int j = i + 1; j < 6; ++j) if (a[j].e < a[m].e) m = j;
        Act t = a[i]; a[i] = a[m]; a[m] = t;
    }
    printf("按结束时间排序：\\n");
    for (int i = 0; i < 6; ++i) printf("  活动 %d: [%d,%d)\\n", a[i].id, a[i].s, a[i].e);
    int chosen[6], k = 0, lastEnd = -1;
    for (int i = 0; i < 6; ++i)
        if (a[i].s >= lastEnd) { chosen[k++] = a[i].id; lastEnd = a[i].e; }
    printf("最多能安排 %d 个活动：", k);
    for (int i = 0; i < k; ++i) printf("%d ", chosen[i]);
    printf("\\n\\n");

    /* 找零钱：面额降序、能拿就拿。只有规范币制（如 1,5,10,25）才保证最优。 */
    int coin[4] = {25, 10, 5, 1}, num[4] = {0};
    int amount = 67, rest = amount;
    for (int i = 0; i < 4; ++i) { num[i] = rest / coin[i]; rest %= coin[i]; }
    printf("用 {25,10,5,1} 凑 %d：", amount);
    for (int i = 0; i < 4; ++i) if (num[i]) printf("%d x %d  ", coin[i], num[i]);
    printf("\\n共 %d 枚，剩余 %d\\n", num[0] + num[1] + num[2] + num[3], rest);
    printf("注意换成 {1,3,4} 凑 6 时贪心会给 4+1+1，而最优是 3+3 —— 该用 DP。\\n");
    return 0;
}
`,
  },
  '素数筛：埃氏筛与欧拉筛': {
    group: '数学与位运算',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

int main() {
    const int N = 50;
    bool isCompA[51], isCompB[51];
    memset(isCompA, 0, sizeof(isCompA));
    memset(isCompB, 0, sizeof(isCompB));

    /* 埃氏筛：每找到一个素数，把它的倍数全划掉。合数会被划多次。 */
    int marksA = 0;
    for (int i = 2; i <= N; ++i)
        if (!isCompA[i])
            for (int j = i * i; j <= N; j += i) { isCompA[j] = true; ++marksA; }

    /* 欧拉筛（线性筛）：每个合数只被「最小的质因子」划一次。
       i % prime[k] == 0 就停，保证后面的数会被更小的质因子处理掉。 */
    int primes[32], pc = 0, marksB = 0;
    for (int i = 2; i <= N; ++i) {
        if (!isCompB[i]) primes[pc++] = i;
        for (int k = 0; k < pc && i * primes[k] <= N; ++k) {
            isCompB[i * primes[k]] = true;
            ++marksB;
            if (i % primes[k] == 0) break;
        }
    }
    printf("50 以内的素数（%d 个）：", pc);
    for (int i = 0; i < pc; ++i) printf("%d ", primes[i]);
    printf("\\n\\n埃氏筛打标记 %d 次，欧拉筛打标记 %d 次\\n", marksA, marksB);
    printf("欧拉筛每个合数只标一次，共 %d 个合数 -> 严格 O(n)\\n", N - 1 - pc);
    return 0;
}
`,
  },
  '辗转相除 / 扩展欧几里得 / 快速幂': {
    group: '数学与位运算',
    stdin: '',
    code: `#include <cstdio>

int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }

/* 扩展欧几里得：返回 gcd(a,b)，并求出 ax + by = gcd(a,b) 的一组整数解。
   递归回代时 x = y1, y = x1 - (a/b)*y1。 */
int exgcd(int a, int b, int& x, int& y) {
    if (b == 0) { x = 1; y = 0; return a; }
    int x1, y1;
    int g = exgcd(b, a % b, x1, y1);
    x = y1;
    y = x1 - (a / b) * y1;
    return g;
}

/* 快速幂：指数按二进制位拆，每步平方，O(log n) 次乘法。 */
long long modPow(long long a, long long e, long long mod) {
    long long r = 1 % mod;
    while (e > 0) {
        if (e & 1) r = r * a % mod;
        a = a * a % mod;
        e >>= 1;
    }
    return r;
}

int main() {
    printf("gcd(1071, 462) = %d\\n", gcd(1071, 462));
    printf("lcm(1071, 462) = %d\\n\\n", 1071 / gcd(1071, 462) * 462);

    int x = 0, y = 0;
    int g = exgcd(35, 15, x, y);
    printf("exgcd(35, 15)：gcd = %d，35*%d + 15*%d = %d\\n", g, x, y, 35 * x + 15 * y);
    printf("验算：%d = %d\\n\\n", 35 * x + 15 * y, g);

    printf("2^10 mod 1000 = %lld\\n", modPow(2, 10, 1000));
    printf("3^13 mod 97   = %lld\\n", modPow(3, 13, 97));
    printf("7^0 mod 5     = %lld\\n", modPow(7, 0, 5));
    return 0;
}
`,
  },
  '大整数阶乘（数组存十进制位）': {
    group: '数学与位运算',
    stdin: '',
    code: `#include <cstdio>

/* int 装不下 30!，就用数组按十进制位存：digits[0] 是个位，
   len 是位数。每次乘 k 时逐位做「乘 + 进位」，最后统一处理高位。 */
int main() {
    const int MAXD = 200;
    int digits[MAXD];
    for (int i = 0; i < MAXD; ++i) digits[i] = 0;
    digits[0] = 1;
    int len = 1;

    const int N = 30;
    for (int k = 2; k <= N; ++k) {
        int carry = 0;
        for (int i = 0; i < len; ++i) {
            int t = digits[i] * k + carry;
            digits[i] = t % 10;
            carry = t / 10;
        }
        while (carry) { digits[len++] = carry % 10; carry /= 10; }
        if (k == 5 || k == 10 || k == 20 || k == 30)
            printf("  %2d! 已有 %d 位\\n", k, len);
    }
    printf("\\n%d! = ", N);
    for (int i = len - 1; i >= 0; --i) printf("%d", digits[i]);
    printf("\\n共 %d 位（30! = 265252859812191058636308480000000，可手算核对）\\n", len);
    return 0;
}
`,
  },
  '树状数组（lowbit 前缀和）': {
    group: '高级数据结构',
    stdin: '',
    code: `#include <cstdio>
#include <cstring>

/* bit[i] 管 [i-lowbit(i)+1, i] 这一段和：查询往前跳 i -= i&-i，
   单点加往后跳 i += i&-i，两个操作都是 O(log n)，且只用一块数组。 */
int bit[16];

int lowbit(int x) { return x & -x; }

void add(int i, int delta, int n) {
    for (; i <= n; i += lowbit(i)) bit[i] += delta;
}

int prefixSum(int i) {
    int s = 0;
    for (; i > 0; i -= lowbit(i)) s += bit[i];
    return s;
}

int main() {
    const int n = 8;
    int a[9] = {0, 3, 1, 4, 1, 5, 9, 2, 6};   // 1-based
    memset(bit, 0, sizeof(bit));
    for (int i = 1; i <= n; ++i) add(i, a[i], n);
    printf("原数组（1-based）：");
    for (int i = 1; i <= n; ++i) printf("%d ", a[i]);
    printf("\\nbit 数组：");
    for (int i = 1; i <= n; ++i) printf("%d ", bit[i]);
    printf("\\n\\n前缀和前 6 项 = %d（3+1+4+1+5+9 = 23）\\n", prefixSum(6));
    printf("区间 [3,7] 之和 = prefix(7)-prefix(2) = %d\\n", prefixSum(7) - prefixSum(2));

    add(4, 10, n);                              // 第 4 项 +10
    printf("\\n第 4 项加 10 后：\\n  区间 [3,7] = %d（应增加 10）\\n", prefixSum(7) - prefixSum(2));
    printf("  bit 数组：");
    for (int i = 1; i <= n; ++i) printf("%d ", bit[i]);
    printf("\\n  （只有下标 4、8 变了，这就是 O(log n)）\\n");
    return 0;
}
`,
  },
  '线段树（4n 数组区间和）': {
    group: '高级数据结构',
    stdin: '',
    code: `#include <cstdio>

/* 完全二叉树的数组表示：节点 p 的左孩子 2p、右孩子 2p+1，
   开 4n 大小的 tree[] 就够。build / query / update 都是递归 O(log n)。 */
int tree[64];
int arr[9] = {0, 3, 1, 4, 1, 5, 9, 2, 6};   // 1-based

void build(int p, int l, int r) {
    if (l == r) { tree[p] = arr[l]; return; }
    int m = (l + r) / 2;
    build(p * 2, l, m);
    build(p * 2 + 1, m + 1, r);
    tree[p] = tree[p * 2] + tree[p * 2 + 1];
}

int query(int p, int l, int r, int ql, int qr) {
    if (ql <= l && r <= qr) return tree[p];   // 整段命中，直接返回
    int m = (l + r) / 2, s = 0;
    if (ql <= m) s += query(p * 2, l, m, ql, qr);
    if (qr > m)  s += query(p * 2 + 1, m + 1, r, ql, qr);
    return s;
}

void update(int p, int l, int r, int idx, int delta) {
    if (l == r) { tree[p] += delta; return; }
    int m = (l + r) / 2;
    if (idx <= m) update(p * 2, l, m, idx, delta);
    else update(p * 2 + 1, m + 1, r, idx, delta);
    tree[p] = tree[p * 2] + tree[p * 2 + 1];
}

int main() {
    const int n = 8;
    build(1, 1, n);
    printf("原数组：");
    for (int i = 1; i <= n; ++i) printf("%d ", arr[i]);
    printf("\\n根节点 tree[1] = %d（总和 31）\\n", tree[1]);
    printf("tree 数组前 15 格：");
    for (int i = 1; i <= 15; ++i) printf("%d ", tree[i]);
    printf("\\n\\n区间 [3,7] 之和 = %d\\n", query(1, 1, n, 3, 7));
    printf("区间 [1,8] 之和 = %d\\n", query(1, 1, n, 1, 8));
    printf("区间 [6,6] 之和 = %d\\n\\n", query(1, 1, n, 6, 6));

    update(1, 1, n, 4, 10);                   // 第 4 项 +10
    arr[4] += 10;
    printf("第 4 项加 10 后：\\n  根 = %d，区间 [3,7] = %d，朴素核对 = %d\\n",
           tree[1], query(1, 1, n, 3, 7),
           arr[3] + arr[4] + arr[5] + arr[6] + arr[7]);
    return 0;
}
`,
  },

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
};
