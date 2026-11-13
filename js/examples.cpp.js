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
};
