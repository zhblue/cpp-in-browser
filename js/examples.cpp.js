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
