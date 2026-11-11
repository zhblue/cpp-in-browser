/* examples.py.js — Python 示例集，纯数据没有逻辑。
   分组和命名对着 examples.cpp.js 那一套来：同一章的数据结构，两边各写一遍，
   上课时可以左右对照（C++ 手写内存与指针，Python 用对象和标准库）。
   注意这是 JS 模板字符串：Python 源码里的转义反斜杠要双写，不然会被 JS 先吃掉。 */
'use strict';

const PY_EXAMPLES = {
  '手工冒泡排序（慢速演示）': {
    group: '慢速演示',
    stdin: '',
    code: `# 30 个数据，手工冒泡。比较 + 交换约 425 / 214 次，
# 双重循环会把当前行高亮一格一格往前推，适合配合「每行停留」看慢动作。
a = [42, 17, 88, 3, 65, 29, 51, 74, 8, 93,
     36, 12, 60, 47, 21, 79, 5, 68, 34, 56,
     90, 15, 63, 40, 72, 26, 85, 11, 49, 23]
n = len(a)
cmp = swp = 0
for i in range(n - 1):
    for j in range(n - 1 - i):
        cmp += 1
        if a[j] > a[j + 1]:
            a[j], a[j + 1] = a[j + 1], a[j]
            swp += 1
    print(f"第 {i + 1:2d} 趟: " + " ".join(f"{x:3d}" for x in a))
print(f"比较 {cmp} 次，交换 {swp} 次")
`,
  },

  '三种排序对比（插入/冒泡/快排）': {
    group: '排序',
    stdin: '',
    code: `import random

def insertion(a):
    a = a[:]
    moves = 0
    for i in range(1, len(a)):
        key, j = a[i], i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
            moves += 1
        a[j + 1] = key
    return a, moves

def bubble(a):
    a = a[:]
    swaps = 0
    for i in range(len(a) - 1):
        done = True
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swaps += 1
                done = False
        if done:
            break
    return a, swaps

def quick(a):
    if len(a) <= 1:
        return a, 0
    pivot = a[len(a) // 2]
    lo = [x for x in a if x < pivot]
    mid = [x for x in a if x == pivot]
    hi = [x for x in a if x > pivot]
    l, c1 = quick(lo)
    h, c2 = quick(hi)
    return l + mid + h, c1 + c2 + len(a)

random.seed(42)
data = [random.randrange(1000) for _ in range(40)]
print("原始:", data[:12], "...")
for name, fn in (("插入", insertion), ("冒泡", bubble), ("快排", quick)):
    out, cost = fn(data)
    assert out == sorted(data)
    print(f"{name}: 前 8 个 {out[:8]}  计数 {cost}")
`,
  },

  '归并排序 + 逆序对计数': {
    group: '排序',
    stdin: '',
    code: `def merge_sort(a):
    """返回 (排好的表, 逆序对个数)。分治到单个元素，合并时数跨越中点的逆序对。"""
    if len(a) <= 1:
        return a[:], 0
    mid = len(a) // 2
    left, cl = merge_sort(a[:mid])
    right, cr = merge_sort(a[mid:])
    out, i, j, cross = [], 0, 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
            cross += len(left) - i   # left[i:] 全都比 right[j] 大
    out += left[i:]
    out += right[j:]
    return out, cl + cr + cross

data = [5, 3, 8, 1, 9, 2, 7, 4, 6, 0]
out, inv = merge_sort(data)
print("原始:", data)
print("排序:", out)
print("逆序对:", inv)
brute = sum(1 for i in range(len(data)) for j in range(i + 1, len(data)) if data[i] > data[j])
print("暴力核对:", brute, "一致" if brute == inv else "不一致")
`,
  },

  '顺序表：插入删除 + 二分查找': {
    group: '线性表',
    stdin: '',
    code: `def lower_bound(a, x):
    """第一个 >= x 的下标；手写二分，不用 bisect。"""
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo

a = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print("初始:", a)
for x in (16, 23, 100):
    i = lower_bound(a, x)
    print(f"lower_bound({x}) = {i}", "命中" if i < len(a) and a[i] == x else "未命中")

a.insert(lower_bound(a, 20), 20)
print("插入 20:", a)
i = lower_bound(a, 12)
if i < len(a) and a[i] == 12:
    a.pop(i)
print("删除 12:", a)
print("长度:", len(a), " 求和:", sum(a))
`,
  },

  '手写单链表：逆置 + 快慢指针': {
    group: '线性表',
    stdin: '',
    code: `class Node:
    __slots__ = ("val", "next")
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

def build(values):
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def reverse(head):
    prev = None
    while head:
        nxt = head.next
        head.next = prev
        prev, head = head, nxt
    return prev

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow

h = build([1, 2, 3, 4, 5, 6, 7])
print("原链:", to_list(h))
print("中间结点（快慢指针）:", middle(h).val)
h = reverse(h)
print("逆置:", to_list(h))
print("再逆置回来:", to_list(reverse(h)))
`,
  },

  '栈：括号匹配 + 逆波兰求值': {
    group: '栈与队列',
    stdin: '',
    code: `def matched(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    st = []
    for i, c in enumerate(s):
        if c in "([{":
            st.append((c, i))
        elif c in pairs:
            if not st or st[-1][0] != pairs[c]:
                return False, i
            st.pop()
    return (not st), (st[-1][1] if st else -1)

def rpn(tokens):
    st = []
    for t in tokens:
        if t in "+-*/":
            b, a = st.pop(), st.pop()
            if t == "+": st.append(a + b)
            elif t == "-": st.append(a - b)
            elif t == "*": st.append(a * b)
            else:
                if b == 0:
                    raise ZeroDivisionError("逆波兰里除以 0")
                st.append(int(a / b))     # 向零取整，和 C++ 一致
        else:
            st.append(int(t))
    return st[0]

for s in ("(a[b]{c})", "([)]", "(()", ""):
    ok, pos = matched(s)
    print(f"{s!r:12} -> {'匹配' if ok else '不匹配，位置 ' + str(pos)}")
print("逆波兰 3 4 + 2 * 7 / =", rpn("3 4 + 2 * 7 /".split()))
`,
  },

  '队列：循环队列 + 约瑟夫环': {
    group: '栈与队列',
    stdin: '',
    code: `class RingQueue:
    """定长循环队列：留一个空位区分「满」和「空」。"""
    def __init__(self, cap):
        self.buf = [None] * (cap + 1)
        self.head = self.tail = 0
    def push(self, x):
        nxt = (self.tail + 1) % len(self.buf)
        if nxt == self.head:
            raise OverflowError("队列满了")
        self.buf[self.tail] = x
        self.tail = nxt
    def pop(self):
        if self.head == self.tail:
            raise IndexError("队列空了")
        x = self.buf[self.head]
        self.head = (self.head + 1) % len(self.buf)
        return x
    def __len__(self):
        return (self.tail - self.head) % len(self.buf)

q = RingQueue(4)
for x in (1, 2, 3, 4):
    q.push(x)
print("入队 4 个，长度", len(q))
print("出队:", q.pop(), q.pop())
q.push(5)
q.push(6)
print("再入队 5、6 后依次出队:", [q.pop() for _ in range(len(q))])

def josephus(n, k):
    """n 个人围一圈，每次数到 k 的出列，返回出列顺序。"""
    people = list(range(1, n + 1))
    out, i = [], 0
    while people:
        i = (i + k - 1) % len(people)
        out.append(people.pop(i))
    return out

order = josephus(7, 3)
print("约瑟夫环 n=7 k=3 出列顺序:", order)
print("最后剩下:", order[-1])
`,
  },

  '二叉树：先中后序 + 层序遍历': {
    group: '树',
    stdin: '',
    code: `from collections import deque

class Tree:
    __slots__ = ("val", "left", "right")
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def preorder(t, out):
    if t:
        out.append(t.val)
        preorder(t.left, out)
        preorder(t.right, out)

def inorder(t, out):
    if t:
        inorder(t.left, out)
        out.append(t.val)
        inorder(t.right, out)

def postorder(t, out):
    if t:
        postorder(t.left, out)
        postorder(t.right, out)
        out.append(t.val)

def levelorder(t):
    out, q = [], deque([t])
    while q:
        node = q.popleft()
        if not node:
            continue
        out.append(node.val)
        q.append(node.left)
        q.append(node.right)
    return out

#        1
#      2   3
#     4 5   6
t = Tree(1, Tree(2, Tree(4), Tree(5)), Tree(3, None, Tree(6)))
for name, fn in (("先序", preorder), ("中序", inorder), ("后序", postorder)):
    out = []
    fn(t, out)
    print(f"{name}: {out}")
print("层序:", levelorder(t))
`,
  },

  '二叉搜索树：插入删除 + 高度': {
    group: '树',
    stdin: '',
    code: `class BST:
    __slots__ = ("key", "left", "right")
    def __init__(self, key):
        self.key, self.left, self.right = key, None, None

def insert(t, k):
    if t is None:
        return BST(k)
    if k < t.key:
        t.left = insert(t.left, k)
    elif k > t.key:
        t.right = insert(t.right, k)
    return t

def height(t):
    return 0 if t is None else 1 + max(height(t.left), height(t.right))

def inorder(t, out):
    if t:
        inorder(t.left, out)
        out.append(t.key)
        inorder(t.right, out)

def erase(t, k):
    if t is None:
        return None
    if k < t.key:
        t.left = erase(t.left, k)
    elif k > t.key:
        t.right = erase(t.right, k)
    else:
        if t.left is None:
            return t.right
        if t.right is None:
            return t.left
        s = t.right                    # 右子树最小结点顶上来
        while s.left:
            s = s.left
        t.key = s.key
        t.right = erase(t.right, s.key)
    return t

root = None
for k in (50, 30, 70, 20, 40, 60, 80):
    root = insert(root, k)
out = []
inorder(root, out)
print("中序（应当有序）:", out, " 高度:", height(root))
root = erase(root, 30)
out = []
inorder(root, out)
print("删掉 30（有两个孩子）:", out, " 高度:", height(root))
`,
  },

  '堆：合并果子（heapq）': {
    group: '树',
    stdin: '',
    code: `import heapq

def merge_cost(weights):
    """每次合并两堆最小的，代价是两堆之和；总代价最小 = 哈夫曼。"""
    h = list(weights)
    heapq.heapify(h)
    total = 0
    steps = []
    while len(h) > 1:
        a = heapq.heappop(h)
        b = heapq.heappop(h)
        total += a + b
        steps.append((a, b, a + b))
        heapq.heappush(h, a + b)
    return total, steps

w = [1, 2, 3, 4, 5]
total, steps = merge_cost(w)
for a, b, s in steps:
    print(f"合并 {a} + {b} = {s}")
print("最小总代价:", total)
print("对照：随便按顺序合并的代价", sum(sum(w[:i + 1]) for i in range(1, len(w))))
`,
  },

  '图：邻接表 + DFS/BFS': {
    group: '图',
    stdin: '',
    code: `from collections import deque

g = {
    1: [2, 3],
    2: [4, 5],
    3: [6],
    4: [],
    5: [6],
    6: [],
}

def dfs(g, start):
    out, seen, st = [], set(), [start]
    while st:
        u = st.pop()
        if u in seen:
            continue
        seen.add(u)
        out.append(u)
        st.extend(reversed(g[u]))     #  reversed 让访问顺序和递归版一致
    return out

def bfs(g, start):
    out, seen, q = [], {start}, deque([start])
    while q:
        u = q.popleft()
        out.append(u)
        for v in g[u]:
            if v not in seen:
                seen.add(v)
                q.append(v)
    return out

print("邻接表:", g)
print("DFS:", dfs(g, 1))
print("BFS:", bfs(g, 1))
`,
  },

  '图：Dijkstra 最短路': {
    group: '图',
    stdin: '',
    code: `import heapq

# (起点, 终点, 边权)
edges = [(1, 2, 7), (1, 3, 9), (1, 6, 14), (2, 3, 10),
         (2, 4, 15), (3, 4, 11), (3, 6, 2), (4, 5, 6), (5, 6, 9)]
n = 6
g = [[] for _ in range(n + 1)]
for u, v, w in edges:
    g[u].append((v, w))
    g[v].append((u, w))             # 无向图

INF = float("inf")
dist = [INF] * (n + 1)
prev = [0] * (n + 1)
dist[1] = 0
pq = [(0, 1)]
while pq:
    d, u = heapq.heappop(pq)
    if d > dist[u]:
        continue                    # 过期条目
    for v, w in g[u]:
        if d + w < dist[v]:
            dist[v] = d + w
            prev[v] = u
            heapq.heappush(pq, (dist[v], v))

for v in range(1, n + 1):
    path, cur = [], v
    while cur:
        path.append(cur)
        cur = prev[cur]
    print(f"1 -> {v}: 距离 {dist[v]:2d}  路径 {' <- '.join(map(str, path))}")
`,
  },

  '并查集：连通块个数': {
    group: '图',
    stdin: '',
    code: `class DSU:
    def __init__(self, n):
        self.fa = list(range(n))
        self.sz = [1] * n
        self.blocks = n
    def find(self, x):
        while self.fa[x] != x:
            self.fa[x] = self.fa[self.fa[x]]   # 路径减半
            x = self.fa[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.sz[ra] < self.sz[rb]:
            ra, rb = rb, ra
        self.fa[rb] = ra
        self.sz[ra] += self.sz[rb]
        self.blocks -= 1
        return True

n = 8
d = DSU(n)
for a, b in ((0, 1), (1, 2), (3, 4), (5, 6), (6, 7), (2, 4)):
    print(f"union({a}, {b}) -> {'合并了' if d.union(a, b) else '本来就一块'}，剩 {d.blocks} 块")
groups = {}
for i in range(n):
    groups.setdefault(d.find(i), []).append(i)
print("连通块:", list(groups.values()))
`,
  },

  'KMP：next 表与所有匹配位置': {
    group: '查找与字符串',
    stdin: '',
    code: `def build_next(p):
    """next[i] = p[:i+1] 的最长相等前后缀长度（不含自身）。"""
    nxt = [0] * len(p)
    k = 0
    for i in range(1, len(p)):
        while k and p[i] != p[k]:
            k = nxt[k - 1]
        if p[i] == p[k]:
            k += 1
        nxt[i] = k
    return nxt

def kmp(s, p):
    if not p:
        return []
    nxt = build_next(p)
    out, k = [], 0
    for i, c in enumerate(s):
        while k and c != p[k]:
            k = nxt[k - 1]
        if c == p[k]:
            k += 1
        if k == len(p):
            out.append(i - k + 1)
            k = nxt[k - 1]
    return out

s = "abababcababab"
p = "abab"
print("文本:", s)
print("模式:", p)
print("next 表:", build_next(p))
pos = kmp(s, p)
print("匹配位置:", pos)
print("暴力核对:", [i for i in range(len(s) - len(p) + 1) if s[i:i + len(p)] == p])
`,
  },

  '散列表：除留余数 + 拉链法': {
    group: '查找与字符串',
    stdin: '',
    code: `class HashTable:
    def __init__(self, cap=7):
        self.cap = cap
        self.buckets = [[] for _ in range(cap)]
        self.size = 0
    def _slot(self, key):
        h = 0
        for c in key:                    # 自己写个多项式散列，结果可复现
            h = (h * 31 + ord(c)) & 0x7fffffff
        return h % self.cap              # 除留余数
    def put(self, key, val):
        b = self.buckets[self._slot(key)]
        for i, (k, _) in enumerate(b):
            if k == key:
                b[i] = (key, val)
                return
        b.append((key, val))
        self.size += 1
    def get(self, key):
        for k, v in self.buckets[self._slot(key)]:
            if k == key:
                return v
        raise KeyError(key)
    def load(self):
        return self.size / self.cap

h = HashTable(7)
for i, name in enumerate(("alice", "bob", "carol", "dave", "eve", "frank", "grace", "heidi")):
    h.put(name, 60 + i * 5)
for slot, b in enumerate(h.buckets):
    print(f"槽 {slot}: " + (" -> ".join(f"{k}={v}" for k, v in b) if b else "(空)"))
print("装填因子:", round(h.load(), 2), " 元素个数:", h.size)
print("查 carol:", h.get("carol"))
`,
  },

  '读入 stdin + 中文输出': {
    group: '基础',
    stdin: `3
Alice 92
Bob 78
Carol 88
`,
    code: `import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        print("没有读到人数", file=sys.stderr)
        return 1
    n = int(data[0])
    students = []
    for i in range(n):
        name, score = data[1 + 2 * i], int(data[2 + 2 * i])
        students.append((name, score))
    students.sort(key=lambda s: -s[1])
    print("成绩排名（降序）:")
    for i, (name, score) in enumerate(students, 1):
        print(f"{i}. {name}  {score}")
    avg = sum(s for _, s in students) / len(students)
    print(f"平均分: {avg:.6g}")
    return 0

sys.exit(main())
`,
  },

  '递归 + 大栈': {
    group: '基础',
    stdin: '',
    code: `import sys
from functools import lru_cache

# CPython 默认递归上限 1000；wasm 里的栈也有限，别一味往上调。
print("默认递归上限:", sys.getrecursionlimit())
sys.setrecursionlimit(3000)

def fact(n):
    return 1 if n <= 1 else n * fact(n - 1)

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

def hanoi(n, a, b, c, out):
    if n:
        hanoi(n - 1, a, c, b, out)
        out.append(f"{a} -> {c}")
        hanoi(n - 1, b, a, c, out)

print("20! =", fact(20))
print("fib(60) =", fib(60))
steps = []
hanoi(4, "A", "B", "C", steps)
print(f"汉诺塔 4 层共 {len(steps)} 步:", " ".join(steps))
print("深度 1500 的递归:", fact(1500) % 1000000007, "(mod 1e9+7)")
`,
  },

  '死循环（演示超时被终止）': {
    group: '演示',
    stdin: '',
    code: `# 点「运行」，到「运行超时(ms)」就会被 terminate 掉。
# Python 侧没有行桩时没法优雅打断，所以和 C++ 一样直接杀 Worker；
# 解释器随后会自动重新初始化，下一次运行不用手动重载。
i = 0
while True:
    i += 1
`,
  },

  '语法错误（演示诊断输出）': {
    group: '演示',
    stdin: '',
    code: `def greet(name)
    print("你好,", name)

x = [1, 2, 3
print(x)
`,
  },

  '运行时异常（演示 traceback）': {
    group: '演示',
    stdin: '',
    code: `def average(xs):
    return sum(xs) / len(xs)

def report(rows):
    for name, scores in rows:
        print(name, average(scores))

report([("甲", [90, 80]), ("乙", []), ("丙", [70])])
`,
  },
};