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

  /* ------------------------------------------------------------------ */
  /* 下面这批摘自《Hello 算法》（https://www.hello-algo.com/）的示例代码， */
  /* 分组和命名对着 examples.cpp.js 那一套来：同一个知识点，C++ 手写指针、 */
  /* Python 用对象和标准库，可以左右对着看。                               */
  /* ------------------------------------------------------------------ */
  '数组：栈上与堆上初始化': {
    group: '线性表',
    stdin: '',
    code: `# 《Hello 算法》「数组」一节：Python 没有「栈上 / 堆上」之分，
# 它的「数组」就是 list。

# 初始化数组
arr: list[int] = [0] * 5   # [ 0, 0, 0, 0, 0 ]
nums: list[int] = [1, 3, 2, 5, 4]
print("数组：", arr)
print("有初始值：", nums)

# [0] * 5 是把同一个整数对象放进去五次，不是复制五份；
# 整数不可变，所以改一项只影响这一项
arr[2] = 99
print("改 arr[2] 之后：", arr)

# list 里可以放各种类型，和定长数组不一样
mixed = [0, 0.0, 'a', False]
print("混合类型：", mixed)
`,
  },
  '链表：节点定义与构建': {
    group: '线性表',
    stdin: '',
    code: `# 《Hello 算法》「链表」一节：节点由「值 + 指向下一个节点的引用」组成。
# 数组靠下标定位，链表靠引用串起来；插删不用搬数据，代价是找第 k 个得一步步走。

class ListNode:
    """链表节点类"""
    def __init__(self, val: int):
        self.val: int = val               # 节点值
        self.next: ListNode | None = None # 指向下一节点的引用


# 初始化链表 1 -> 3 -> 2 -> 5 -> 4
# 初始化各个节点
n0 = ListNode(1)
n1 = ListNode(3)
n2 = ListNode(2)
n3 = ListNode(5)
n4 = ListNode(4)
# 构建节点之间的引用
n0.next = n1
n1.next = n2
n2.next = n3
n3.next = n4

# 遍历
vals = []
p = n0
while p is not None:
    vals.append(p.val)
    p = p.next
print("链表：", " -> ".join(str(v) for v in vals))
print("长度：", len(vals))

# 链表没有 size 字段，长度只能一步步数出来
length = 0
p = n0
while p is not None:
    length += 1
    p = p.next
print("再数一遍长度：", length)
`,
  },
  '双向链表：节点定义与摘除': {
    group: '线性表',
    stdin: '',
    code: `# 《Hello 算法》「常见链表类型」：单链表只能往前走，
# 双向链表多一个 prev，删掉当前节点时不用再回头找前驱。

class ListNode:
    """双向链表节点类"""
    def __init__(self, val: int):
        self.val: int = val                # 节点值
        self.next: ListNode | None = None  # 指向后继节点的引用
        self.prev: ListNode | None = None  # 指向前驱节点的引用


n0, n1, n2 = ListNode(1), ListNode(3), ListNode(2)
n0.next, n1.prev = n1, n0
n1.next, n2.prev = n2, n1

# 正向
vals, p = [], n0
while p is not None:
    vals.append(p.val)
    p = p.next
print("正向：", vals)

# 反向
vals, p = [], n2
while p is not None:
    vals.append(p.val)
    p = p.prev
print("反向：", vals)

# 摘掉中间那个：prev / next 各改一次，不用从头找前驱
n0.next = n1.next
n1.next.prev = n0
vals, p = [], n0
while p is not None:
    vals.append(p.val)
    p = p.next
print("删掉 3 之后正向：", vals)
`,
  },
  '列表：增删改查与排序': {
    group: '线性表',
    stdin: '',
    code: `# 《Hello 算法》「列表」一节：初始化、访问、更新、插入、删除、
# 遍历、拼接、排序，八个动作挨个走一遍。

# 初始化列表
nums: list[int] = [1, 3, 2, 5, 4]
nums1: list[int] = []           # 无初始值
print("初始化：", nums)

# 访问元素
num: int = nums[1]               # 访问索引 1 处的元素
print("索引 1 处：", num)
# 更新元素
nums[1] = 0                      # 将索引 1 处的元素更新为 0
print("更新索引 1 之后：", nums)

# 清空列表（先留着数据，下面还要用）
saved = nums[:]
nums.clear()
print("清空之后：", nums)

# 在尾部添加元素
nums.append(1)
nums.append(3)
nums.append(2)
nums.append(5)
nums.append(4)
# 在中间插入元素
nums.insert(3, 6)               # 在索引 3 处插入数字 6
print("插入 6 之后：", nums)
# 删除元素
nums.pop(3)                      # 删除索引 3 处的元素
print("删掉索引 3 之后：", nums)

# 遍历列表：通过索引遍历
count = 0
for i in range(len(nums)):
    count += nums[i]
print("按下标遍历求和：", count)
# 直接遍历列表元素
count = 0
for x in nums:
    count += x
print("直接遍历求和：", count)

# 拼接列表
nums1: list[int] = [6, 8, 7, 10, 9]
nums += nums1                    # 将列表 nums1 拼接到 nums 之后
print("拼接之后：", nums)

# 排序列表
nums.sort()                      # 排序后，列表元素从小到大排列
print("排序之后：", nums)
print("一开始那份还在：", saved)
`,
  },
  '栈的常用操作': {
    group: '栈与队列',
    stdin: '',
    code: `# 《Hello 算法》「栈」一节：后进先出。
# Python 没有内置的栈类，可以把 list 当作栈来使用。

# 初始化栈
stack: list[int] = []

# 元素入栈
stack.append(1)
stack.append(3)
stack.append(2)
stack.append(5)
stack.append(4)

# 访问栈顶元素
peek: int = stack[-1]
print("栈顶：", peek)

# 获取栈的长度 / 判断是否为空
print("栈里", len(stack), "个，空吗？", "空" if not stack else "不空")

# 元素出栈
pop: int = stack.pop()
print("弹出一个：", pop)

# 一路弹到底，出来的是倒序
print("出栈顺序：", end="")
while stack:
    print(" ", stack.pop())
print()
`,
  },
  '队列的常用操作': {
    group: '栈与队列',
    stdin: '',
    code: `# 《Hello 算法》「队列」一节：先进先出。
# 在 Python 中，我们一般将双向队列类 deque 当作队列使用；
# 虽然 queue.Queue() 是纯正的队列类，但不太好用，因此不推荐。
from collections import deque

# 初始化队列
que: deque[int] = deque()

# 元素入队
que.append(1)
que.append(3)
que.append(2)
que.append(5)
que.append(4)

# 访问队首元素
front: int = que[0]
print("队首：", front)

# 获取队列的长度 / 判断是否为空
print("队列里", len(que), "个，空吗？", "空" if not que else "不空")

# 元素出队
pop: int = que.popleft()
print("弹出一个：", pop)

print("剩下的出队顺序：", end="")
while que:
    print(" ", que.popleft())
print()
`,
  },
  '双向队列的常用操作': {
    group: '栈与队列',
    stdin: '',
    code: `# 《Hello 算法》「双向队列」一节：两头都能进出，既能当队列也能当栈。
from collections import deque

# 初始化双向队列
deq: deque[int] = deque()

# 元素入队
deq.append(2)      # 添加至队尾
deq.append(5)
deq.append(4)
deq.appendleft(3)  # 添加至队首
deq.appendleft(1)

# 访问元素
front: int = deq[0]   # 队首元素
rear: int = deq[-1]   # 队尾元素
print("队首：", front, " 队尾：", rear)

# 获取双向队列的长度 / 判断是否为空
print("长度", len(deq), "，空吗？", "空" if not deq else "不空")

# 元素出队
pop_front: int = deq.popleft()   # 队首元素出队
pop_rear: int = deq.pop()        # 队尾元素出队
print("弹出队首", pop_front, "、队尾", pop_rear, "，剩下：", list(deq))
`,
  },
  '优先队列（大顶堆 / 小顶堆）': {
    group: '堆',
    stdin: '',
    code: `# 《Hello 算法》「堆」一节：Python 的 heapq 模块默认实现小顶堆。
# 考虑将“元素取负”后再入堆，这样就可以将大小关系颠倒，从而实现大顶堆。
# 在本示例中，flag = 1 时对应小顶堆，flag = -1 时对应大顶堆。
import heapq

# 初始化小顶堆
min_heap, flag = [], 1
# 初始化大顶堆
max_heap, flag = [], -1

# 元素入堆
heapq.heappush(max_heap, flag * 1)
heapq.heappush(max_heap, flag * 3)
heapq.heappush(max_heap, flag * 2)
heapq.heappush(max_heap, flag * 5)
heapq.heappush(max_heap, flag * 4)

# 获取堆顶元素
peek: int = flag * max_heap[0]   # 5
print("堆顶元素：", peek)

# 获取堆大小 / 判断堆是否为空
print("堆里", len(max_heap), "个，空吗？", "空" if not max_heap else "不空")

# 堆顶元素出堆，出堆元素会形成一个从大到小的序列
print("出堆顺序：", end="")
while max_heap:
    print(" ", flag * heapq.heappop(max_heap))
print()

# 输入列表并建堆
min_heap2: list[int] = [1, 3, 2, 5, 4]
heapq.heapify(min_heap2)
print("小顶堆堆顶：", min_heap2[0])
`,
  },
  '哈希表：增删查与遍历': {
    group: '哈希',
    stdin: '',
    code: `# 《Hello 算法》「哈希表」一节：键值对存进去，按键查回来。
# dict 保证按插入顺序遍历，下面直接打印即可。

# 初始化哈希表
hmap: dict = {}

# 添加操作：在哈希表中添加键值对 (key, value)
hmap[12836] = "小哈"
hmap[15937] = "小啰"
hmap[16750] = "小算"
hmap[13276] = "小法"
hmap[10583] = "小鸭"
print("放进去", len(hmap), "项")

# 查询操作：向哈希表中输入键 key，得到值 value
name: str = hmap[15937]
print("查 15937 ->", name)
# Python 遇到不存在的键会抛 KeyError（不像 C++ 的 operator[] 那样顺手插一个空值），
# 所以「查不到」要用 get，它不会改动表
print("查 99999 ->", hmap.get(99999, "（键不存在）"))
print("表里还是", len(hmap), "项")

# 删除操作：在哈希表中删除键值对 (key, value)
hmap.pop(10583)
print("删掉 10583 之后还有", len(hmap), "项")

# 遍历哈希表：遍历键值对 key->value
for key, value in hmap.items():
    print(" ", key, "->", value)
`,
  },
  '内置哈希函数 hash()': {
    group: '哈希',
    stdin: '',
    code: `# 《Hello 算法》「哈希算法」一节：hash() 把对象散列成一个整数，
# 这个整数只配当字典的索引用，不是身份标识。
# 字符串的哈希值每次运行都不一样：Python 故意加了随机盐，
# 防的是有人故意构造键去撞哈希表（哈希碰撞攻击）。

num = 3
hash_num = hash(num)
print("整数 3 的哈希值为", hash_num)

bol = True
hash_bol = hash(bol)
print("布尔量 True 的哈希值为", hash_bol)

dec = 3.14159
hash_dec = hash(dec)
print("小数 3.14159 的哈希值为", hash_dec)

s = "Hello"
hash_str = hash(s)
print("字符串 Hello 的哈希值为", hash_str)

tup = (12836, "小哈")
hash_tup = hash(tup)
print("元组 (12836, '小哈') 的哈希值为", hash_tup)

print()
print("注意：哈希值每次运行可能不同（字符串尤其明显），")
print("判断两个对象是不是同一个，要比内容，不是比哈希值。")
`,
  },
  '二叉树：初始化与节点插入删除': {
    group: '树',
    stdin: '',
    code: `# 《Hello 算法》「二叉树」一节：节点由「值 + 左孩子 + 右孩子」组成。
# 插入就是在父子之间插一个节点，删除就是把孩子接到父亲那边。

class TreeNode:
    """二叉树节点类"""
    def __init__(self, val: int):
        self.val: int = val                # 节点值
        self.left: TreeNode | None = None  # 左子节点引用
        self.right: TreeNode | None = None # 右子节点引用


def in_order(node):
    """中序遍历：左 -> 根 -> 右，出来就是升序"""
    if node is None:
        return []
    return in_order(node.left) + [node.val] + in_order(node.right)


# 初始化二叉树
# 初始化节点
n1 = TreeNode(val=1)
n2 = TreeNode(val=2)
n3 = TreeNode(val=3)
n4 = TreeNode(val=4)
n5 = TreeNode(val=5)
# 构建节点之间的引用（指针）
n1.left = n2
n1.right = n3
n2.left = n4
n2.right = n5
print("中序遍历：", in_order(n1))

# 插入与删除节点
p = TreeNode(0)
# 在 n1 -> n2 中间插入节点 P
n1.left = p
p.left = n2
print("插入 0 之后中序遍历：", in_order(n1))

# 删除节点 P
n1.left = n2
print("删掉 0 之后中序遍历：", in_order(n1))
`,
  },
  '二叉树的数组表示': {
    group: '树',
    stdin: '',
    code: `# 《Hello 算法》「二叉树的数组表示」：二叉树摊平成一个列表，
# 下标 i（从 0 起）的左孩子是 2i+1、右孩子是 2i+2，空位用 None 标记。
# 省掉了引用，但只对完全二叉树天然合适。

# 使用 None 来表示空位
tree = [1, 2, 3, 4, None, 6, 7, 8, 9, None, None, 12, None, None, 15]

print("下标 -> 值（None 是空位）：")
for i, val in enumerate(tree):
    line = f"  [{i}] "
    if val is None:
        print(line + "空")
        continue
    line += str(val)
    l, r = 2 * i + 1, 2 * i + 2
    if l < len(tree) and tree[l] is not None:
        line += f"  左孩子 [{l}] = {tree[l]}"
    if r < len(tree) and tree[r] is not None:
        line += f"  右孩子 [{r}] = {tree[r]}"
    print(line)
`,
  },
  'AVL 树：节点、高度与平衡因子': {
    group: '树',
    stdin: '',
    code: `# 《Hello 算法》「AVL 树」一节：AVL 树要求每个节点的左右子树高度差不超过 1，
# 插进去发现失衡就旋转（左边高就右旋，右边高就左旋）。
# 这里给出节点定义、节点高度和平衡因子，再拿一棵一路插左边的树算一遍，
# 看看它是从哪一层开始失衡的。

class TreeNode:
    """AVL 树节点类"""
    def __init__(self, val: int):
        self.val: int = val                 # 节点值
        self.height: int = 0                # 节点高度
        self.left: TreeNode | None = None   # 左子节点引用
        self.right: TreeNode | None = None  # 右子节点引用


def height(node):
    """节点高度"""
    if node is None:
        return 0
    return node.height


def balance_factor(node):
    """节点平衡因子 = 左子树高度 - 右子树高度"""
    if node is None:
        return 0
    return height(node.left) - height(node.right)


def update_height(node):
    """更新高度：孩子的高度得先算好，所以自底向上"""
    if node is None:
        return
    update_height(node.left)
    update_height(node.right)
    node.height = max(height(node.left), height(node.right)) + 1


def print_tree(node, depth=0):
    if node is None:
        return
    print_tree(node.right, depth + 1)
    flag = "  ← 失衡，该右旋了" if balance_factor(node) > 1 else ""
    print("    " * depth + f"{node.val}（高 {node.height}，平衡因子 {balance_factor(node)}{flag}）")
    print_tree(node.left, depth + 1)


n1 = TreeNode(1)
n2 = TreeNode(2)
n3 = TreeNode(3)
n4 = TreeNode(4)
n1.left = n2
n2.left = n3
n3.left = n4

update_height(n1)
print_tree(n1)
print()
print("平衡因子绝对值超过 1 的节点就是失衡节点。")
print("上面这棵树一路插到左边，失衡就从 2 那层开始了。")
`,
  },
  '回溯算法框架': {
    group: '回溯',
    stdin: '',
    code: `# 《Hello 算法》「回溯算法」一节：框架本身是空的，只有四步——
# 判断是否为解、遍历所有选择、剪枝、尝试与回退。
# 下面拿「从数组里挑出和为 target 的子集」把它填起来，
# 四个函数正好对应框架里的四行。

class State:
    def __init__(self, nums, target):
        self.nums = nums        # 待选数组
        self.path = []          # 已经选中的下标
        self.sum = 0            # 已选元素之和
        self.target = target


def is_solution(state):
    """判断是否为解"""
    return state.sum == state.target


def record_solution(state, res):
    """记录解"""
    res.append([state.nums[i] for i in state.path])


def is_valid(state, idx):
    """剪枝：下标必须递增，否则同一个组合会被找到许多次"""
    return not state.path or idx > state.path[-1]


def make_choice(state, idx):
    """尝试：做出选择，更新状态"""
    state.path.append(idx)
    state.sum += state.nums[idx]


def undo_choice(state, idx):
    """回退：撤销选择，恢复到之前的状态"""
    state.path.pop()
    state.sum -= state.nums[idx]


def backtrack(state, choices, res):
    """回溯算法框架"""
    # 判断是否为解
    if is_solution(state):
        # 记录解
        record_solution(state, res)
        # 不再继续搜索
        return
    # 遍历所有选择
    for choice in choices:
        # 剪枝：判断选择是否合法
        if is_valid(state, choice):
            # 尝试：做出选择，更新状态
            make_choice(state, choice)
            backtrack(state, choices, res)
            # 回退：撤销选择，恢复到之前的状态
            undo_choice(state, choice)


state = State([3, 4, 5, 6], 9)
choices = [0, 1, 2, 3]
res = []
backtrack(state, choices, res)

print(f"从 {state.nums} 里挑和为 {state.target} 的子集：")
for one in res:
    print("  " + " + ".join(str(x) for x in one))
print("共", len(res), "种")
`,
  },
  '时间复杂度各阶对照': {
    group: '复杂度',
    stdin: '',
    code: `# 《Hello 算法》「时间复杂度」一节：把同一个 n 丢给不同阶的算法，
# 看操作次数怎么长。次数是算出来的，不是真跑出来的——
# 真跑 O(n!) 到 n=20 要 20! ≈ 2.4e18 次，没人等得起。
import math


def ops_const(n):
    return 1


def ops_linear(n):
    return n


def ops_quad(n):
    return n * n


def ops_log(n):
    c = 0
    while (1 << c) <= n:
        c += 1
    return c


def ops_nlogn(n):
    return n * ops_log(n)


def ops_exp(n):
    return 1 << n


def ops_fact(n):
    return math.factorial(n)


print(f"{'n':>4}{'O(1)':>10}{'O(n)':>10}{'O(n^2)':>12}{'O(log n)':>12}{'O(n log n)':>14}{'O(2^n)':>14}{'O(n!)':>24}")
for n in (10, 20):
    print(f"{n:>4}{ops_const(n):>10}{ops_linear(n):>10}{ops_quad(n):>12}"
          f"{ops_log(n):>12}{ops_nlogn(n):>14}{ops_exp(n):>14}{ops_fact(n):>24}")

print()
print("n 从 10 翻到 20（一倍的 n），操作次数慢了几倍：")
print("  O(1)     不变")
print("  O(n)     ", ops_linear(20) // ops_linear(10), "倍")
print("  O(n^2)   ", ops_quad(20) // ops_quad(10), "倍")
print("  O(2^n)   ", ops_exp(20) // ops_exp(10), "倍")
print("  O(n!)    ", ops_fact(20) // ops_fact(10), "倍")
`,
  },
  '空间复杂度：循环与递归': {
    group: '复杂度',
    stdin: '',
    code: `# 《Hello 算法》「空间复杂度」一节：循环里的临时变量用完就还，
# 递归每多调一层就多占一个栈帧，深 n 层就是 O(n)。

def function() -> int:
    """函数"""
    # 执行某些操作...
    return 0


def loop(n: int):
    """循环的空间复杂度为 O(1)"""
    for _ in range(n):
        function()


deepest = 0


def recur(n: int):
    """递归的空间复杂度为 O(n)"""
    global deepest
    if n == 1:
        return 1
    r = recur(n - 1)
    if n > deepest:          # 一路回溯上来，记下最深的一层
        deepest = n
    return r


loop(1000000)
print("循环跑完 1000000 次：栈帧始终只有一个，O(1)")

recur(500)
print("递归 500 层：最深用到第", deepest, "层栈帧，O(n)")
print("（栈有上限：Python 默认递归上限 1000 层，再深就 RecursionError 了）")

# 变量占多少空间也分 O(1) 和 O(n)
a = 0                 # 暂存数据（常量，一般用大写字母表示）
b = 0                 # 暂存数据（变量）
c = [0] * 10000       # 长度固定，永远 O(1)
d = [0] * 10000 if 10000 > 10 else []   # 长度随 n 变，就是 O(n)
print("常量 a、变量 b、固定长度 10000 的列表 c：O(1)")
print("长度随 n 增长的列表 d：O(n)")
print("a=", a, "b=", b, "c[0]=", c[0], "d[9999]=", d[9999])
`,
  },
  '多种基本数据类型初始化数组': {
    group: '基础',
    stdin: '',
    code: `# 《Hello 算法》「基本数据类型」一节：Python 的列表能装各种类型，
# 不像定长数组那样先定死元素类型。

# 使用多种基本数据类型来初始化数组
numbers: list[int] = [0] * 5
decimals: list[float] = [0.0] * 5
# Python 的字符实际上是长度为 1 的字符串
characters: list[str] = ['0'] * 5
bools: list[bool] = [False] * 5

# Python 的列表可以自由存储各种基本数据类型和对象引用
data = [0, 0.0, 'a', False]

for i in range(5):
    numbers[i] = i + 1
    decimals[i] = i + 0.5
    characters[i] = chr(ord('a') + i)
    bools[i] = (i % 2 == 0)

print("int   ：", numbers)
print("float ：", decimals)
print("str   ：", characters)
print("bool  ：", bools)
print("混合  ：", data)
print()
print("注意：Python 没有 char 类型，'a' 就是长度为 1 的字符串。")
`,
  },
  /* ------------------------------------------------------------------ */
  /* 与 examples.cpp.js 新增的那一批同名同分组：C++ 用定长数组和下标，  */
  /* Python 用 list 和下标，逐条左右对照着看。                           */
  /* ------------------------------------------------------------------ */
  '选择排序 + 希尔排序': {
    group: '排序',
    stdin: '',
    code: `# 选择排序与希尔排序：都用列表（Python 的数组）原地做，和 C++ 版逐步对照。

def show(tag, a):
    print(tag, *a)

def selection_sort(a):
    cmp = swp = 0
    for i in range(len(a) - 1):
        m = i
        for j in range(i + 1, len(a)):
            cmp += 1
            if a[j] < a[m]:
                m = j
        if m != i:
            a[i], a[m] = a[m], a[i]
            swp += 1
    return cmp, swp

def shell_sort(a):
    cmp = mv = 0
    gap = len(a) // 2
    while gap > 0:
        for i in range(gap, len(a)):
            x, j = a[i], i
            while j >= gap:
                cmp += 1
                if a[j - gap] <= x:
                    break
                a[j] = a[j - gap]
                mv += 1
                j -= gap
            a[j] = x
            mv += 1
        print("  gap=%d：" % gap, *a)
        gap //= 2
    return cmp, mv

raw = [9, 5, 1, 8, 3, 7, 2, 6, 4, 0]
show("原始数据：", raw)
a = raw[:]
print("选择排序：比较 %d 次，交换 %d 次" % selection_sort(a))
show("  ", a)
b = raw[:]
print("希尔排序：比较 %d 次，移动 %d 次" % shell_sort(b))
`,
  },
  '堆排序（数组版建堆与下沉）': {
    group: '排序',
    stdin: '',
    code: `# 数组即完全二叉树：i 的孩子是 2i+1 / 2i+2。这里手写下沉，不用 heapq。
cmp_cnt = swp_cnt = 0

def sift_down(a, root, end):
    global cmp_cnt, swp_cnt
    while 2 * root + 1 < end:
        child = 2 * root + 1
        cmp_cnt += 1
        if child + 1 < end and a[child + 1] > a[child]:
            child += 1
        cmp_cnt += 1
        if a[root] >= a[child]:
            break
        a[root], a[child] = a[child], a[root]
        swp_cnt += 1
        root = child

def heap_sort(a):
    global swp_cnt
    for i in range(len(a) // 2 - 1, -1, -1):
        sift_down(a, i, len(a))
    print("建堆完成（大顶堆）：", *a)
    for end in range(len(a) - 1, 0, -1):
        a[0], a[end] = a[end], a[0]
        swp_cnt += 1
        sift_down(a, 0, end)

a = [4, 10, 3, 5, 1, 8, 7, 2, 9, 6, 0, 11]
print("原始数据：", *a)
heap_sort(a)
print("排序结果：", *a)
print("比较 %d 次，交换 %d 次；时间 O(n log n)，额外空间 O(1)" % (cmp_cnt, swp_cnt))
`,
  },
  '计数排序 + 桶排序': {
    group: '排序',
    stdin: '',
    code: `# 非比较排序：值域小用计数，分布均匀用分桶，桶内插入排序。

def counting_sort(a, max_v):
    cnt = [0] * (max_v + 1)
    for x in a:
        cnt[x] += 1
    for v in range(1, max_v + 1):
        cnt[v] += cnt[v - 1]
    out = [0] * len(a)
    for x in reversed(a):          # 倒着放才稳定
        cnt[x] -= 1
        out[cnt[x]] = x
    return out

a = [7, 3, 9, 1, 7, 5, 2, 8, 3, 6, 4, 0]
print("计数排序：", *counting_sort(a, 9))
print("（值域 0..9，重复值 3、7 的相对次序保持不变）\\n")

raw = [29, 5, 71, 18, 44, 93, 36, 60, 12, 87, 51, 66]
buckets = [[] for _ in range(5)]
for x in raw:
    buckets[x // 20].append(x)
print("桶分布（每桶内先插入排序）：")
for b, bucket in enumerate(buckets):
    for i in range(1, len(bucket)):
        x, j = bucket[i], i - 1
        while j >= 0 and bucket[j] > x:
            bucket[j + 1] = bucket[j]
            j -= 1
        bucket[j + 1] = x
    print("  桶 %d：" % b, *bucket)
print("桶排序结果：", *(x for bucket in buckets for x in bucket))
`,
  },
  '基数排序（按位分桶）': {
    group: '排序',
    stdin: '',
    code: `# LSD 基数排序：从个位到最高位，每一趟都按该位做稳定分桶。

def radix_sort(a):
    exp = 1
    while exp <= max(a):
        buckets = [[] for _ in range(10)]
        for x in a:                        # 按当前位依次入桶，天然稳定
            buckets[(x // exp) % 10].append(x)
        a = [x for bucket in buckets for x in bucket]
        print("  按 10^%d 位分桶后：" % (len(str(exp)) - 1), *a)
        exp *= 10
    return a

a = [170, 45, 75, 90, 2, 802, 24, 66, 8, 301, 123, 55]
print("原始数据：", *a)
print("排序结果：", *radix_sort(a))
print("复杂度 O(d(n+10))，d 是最大位数；每一趟都必须稳定。")
`,
  },
  '双指针：去重 / 两数之和 / 反转': {
    group: '数组技巧',
    stdin: '',
    code: `# 有序列表上的三个双指针套路，全程只用下标，额外空间 O(1)。

def dedup(a):
    if not a:
        return 0
    w = 1
    for r in range(1, len(a)):
        if a[r] != a[w - 1]:
            a[w] = a[r]
            w += 1
    return w

def two_sum(a, n, target):
    l, r = 0, n - 1
    while l < r:
        s = a[l] + a[r]
        if s == target:
            return l, r
        if s < target:
            l += 1
        else:
            r -= 1
    return None

a = [1, 1, 2, 2, 2, 3, 4, 4, 5, 6, 6, 7]
k = dedup(a)
print("去重后长度 %d：" % k, *a[:k])
ans = two_sum(a, k, 9)
print("两数之和 9 ->", ("下标 %d 和 %d（%d + %d）" % (ans[0], ans[1], a[ans[0]], a[ans[1]])) if ans else "没找到")
print("反转后：", *reversed(a[:k]))
`,
  },
  '前缀和与差分数组': {
    group: '数组技巧',
    stdin: '',
    code: `# 前缀和回答「区间和」，差分回答「多次区间加」，都是数组的预处理技巧。
a = [2, 5, 1, 7, 3, 6, 4, 8]
n = len(a)
pre = [0] * (n + 1)
for i, x in enumerate(a):
    pre[i + 1] = pre[i] + x
print("前缀和：", *pre)
print("  a[2..5] = pre[6]-pre[2] =", pre[6] - pre[2])
print("  a[0..7] =", pre[n] - pre[0], "\\n")

d = [0] * (n + 2)
d[0] = a[0]
for i in range(1, n):
    d[i] = a[i] - a[i - 1]
ops = [(1, 4, 10), (3, 6, 5), (0, 2, -2)]
for l, r, v in ops:
    d[l] += v
    d[r + 1] -= v
    print("  区间 [%d,%d] 加 %d" % (l, r, v))
cur = 0
restored = []
for i in range(n):
    cur += d[i]
    restored.append(cur)
print("还原后的数组：", *restored)
expect = [a[i] + sum(v for l, r, v in ops if l <= i <= r) for i in range(n)]
print("逐项核对：", *expect)
`,
  },
  '滑动窗口：定长最大和与最短子数组': {
    group: '数组技巧',
    stdin: '',
    code: `# 滑动窗口：右端点一直往前，左端点只在条件被破坏时跟进，整体 O(n)。
a = [2, 3, 5, 1, 6, 4, 8, 2, 7, 3]
n = len(a)
k = 3
s = sum(a[:k])
best, best_l = s, 0
wins = []
for r in range(k, n):
    wins.append("[0..%d]=%d" % (r - 1, s) if r == k else "[%d..%d]=%d" % (r - k, r - 1, s))
    s += a[r] - a[r - k]
    if s > best:
        best, best_l = s, r - k + 1
wins.append("[%d..%d]=%d" % (n - k, n - 1, s))
if s > best:
    best, best_l = s, n - k
print("长度 %d 的窗口：" % k, *wins)
print("最大窗口和 = %d（起点下标 %d）\\n" % (best, best_l))

target = 15
l = cur = 0
min_len, ans_l = n + 1, -1
for r, x in enumerate(a):
    cur += x
    while cur >= target:
        if r - l + 1 < min_len:
            min_len, ans_l = r - l + 1, l
        cur -= a[l]
        l += 1
if ans_l >= 0:
    print("和 >= %d 的最短子数组：长度 %d，起点 %d，元素" % (target, min_len, ans_l),
          *a[ans_l:ans_l + min_len])
else:
    print("和 >= %d 的最短子数组：不存在" % target)
`,
  },
  '静态链表（游标数组实现）': {
    group: '数组技巧',
    stdin: '',
    code: `# 不用对象引用：节点存在列表里，nxt 存「下一个节点的下标」，-1 表示空。
vals = [0] * 32
nxt = list(range(1, 32)) + [-1]
free_head, used = 0, 0

def alloc(v):
    global free_head, used
    if free_head == -1:
        return -1
    p = free_head
    free_head = nxt[p]
    vals[p], nxt[p] = v, -1
    used += 1
    return p

def release(p):
    global free_head, used
    nxt[p] = free_head
    free_head = p
    used -= 1

def show(head):
    out = []
    while head != -1:
        out.append(str(vals[head]))
        head = nxt[head]
    print(" -> ".join(out + ["NULL"]))

head = tail = -1
for i in range(5):
    p = alloc(i * 10 + 1)
    if head == -1:
        head = p
    else:
        nxt[tail] = p
    tail = p
print("建好的链表：", end=" ")
show(head)
print("节点都是数组下标，第一个节点下标 = %d，已用 %d 个" % (head, used))

p = alloc(99)
q = head
while q != -1:
    if vals[q] == 21:
        nxt[p], nxt[q] = nxt[q], p
        break
    q = nxt[q]
print("21 后面插入 99：", end=" ")
show(head)

prev, q = -1, head
while q != -1:
    if vals[q] == 11:
        if prev == -1:
            head = nxt[q]
        else:
            nxt[prev] = nxt[q]
        release(q)
        break
    prev, q = q, nxt[q]
print("删除 11 之后：", end=" ")
show(head)
print("已用节点 %d 个（删除的下标被回收复用）" % used)
`,
  },
  '二维数组：杨辉三角与螺旋遍历': {
    group: '数组技巧',
    stdin: '',
    code: `# 二维数组：杨辉三角按「左肩 + 右肩」填，螺旋遍历靠四条边界往里缩。
n = 7
tri = [[0] * n for _ in range(n)]
for i in range(n):
    tri[i][0] = tri[i][i] = 1
    for j in range(1, i):
        tri[i][j] = tri[i - 1][j - 1] + tri[i - 1][j]
print("杨辉三角（第 n 行就是二项式系数）：")
for i in range(n):
    print(" " * (n - i), " ".join("%3d" % tri[i][j] for j in range(i + 1)))
print("第 6 行之和 = %d = 2^6 = 64\\n" % sum(tri[6]))

m = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10],
     [11, 12, 13, 14, 15], [16, 17, 18, 19, 20]]
top, bottom, left, right = 0, 3, 0, 4
order = []
while top <= bottom and left <= right:
    order += m[top][left:right + 1]
    top += 1
    order += [m[r][right] for r in range(top, bottom + 1)]
    right -= 1
    if top <= bottom:
        order += [m[bottom][c] for c in range(right, left - 1, -1)]
        bottom -= 1
    if left <= right:
        order += [m[r][left] for r in range(bottom, top - 1, -1)]
        left += 1
print("4x5 矩阵螺旋顺序：", *order)
print("一共 %d 个数，正好不重不漏" % len(order))
`,
  },
  '单调栈：下一个更大元素与最大矩形': {
    group: '栈与队列',
    stdin: '',
    code: `# 单调栈：栈里存下标且对应值单调，弹栈时正好确定「第一个更大/更小」。
a = [4, 7, 3, 5, 2, 9, 6, 1]
n = len(a)
nge = [-1] * n
st = []
for i, x in enumerate(a):
    while st and a[st[-1]] < x:
        nge[st.pop()] = x
    st.append(i)
print("数组：", *a)
print("下一个更大元素：", *nge, " （-1 表示右边没有更大的）\\n")

h = [2, 1, 5, 6, 2, 3, 0]      # 末尾 0 是哨兵，逼着最后全部弹栈
best = (0, 0, 0, 0)            # 面积, 高, 宽, 起点
st = []
for i, x in enumerate(h):
    while st and h[st[-1]] > x:
        height = h[st.pop()]
        l = st[-1] + 1 if st else 0
        width = i - l
        area = height * width
        if area > best[0]:
            best = (area, height, width, l)
    st.append(i)
print("柱状图：", *h[:-1])
print("最大矩形面积 = %d（高 %d x 宽 %d，从下标 %d 开始）" % best)
`,
  },
  '单调队列：滑动窗口最大值': {
    group: '栈与队列',
    stdin: '',
    code: `# 队头永远是当前窗口最大值的下标；比自己小又更旧的下标可以放心弹掉。
a = [4, 2, 8, 5, 1, 9, 3, 7, 6, 0]
k = 3
q = []                     # 存下标，对应值单调递减
ans = []
for i, x in enumerate(a):
    while q and a[q[-1]] <= x:
        q.pop()
    q.append(i)
    while q and q[0] <= i - k:
        q.pop(0)
    if i >= k - 1:
        ans.append(a[q[0]])
print("数组：", *a)
print("窗口大小 k=%d，最大值依次为：" % k, *ans)
print("朴素 O(nk) 对照：", *(max(a[i:i + k]) for i in range(len(a) - k + 1)))
`,
  },
  '数组栈：中缀转后缀并求值': {
    group: '栈与队列',
    stdin: '',
    code: `# 两个列表当栈：op 存运算符，val 存操作数，不用任何栈类。
def prec(c):
    return 1 if c in "+-" else 2 if c in "*/" else 0

expr = "12 + 3 * (8 - 6) / 2"
post, op = [], []
i = 0
while i < len(expr):
    c = expr[i]
    if c == " ":
        i += 1
    elif c.isdigit():
        j = i
        while j < len(expr) and expr[j].isdigit():
            j += 1
        post.append(expr[i:j])
        i = j
    elif c == "(":
        op.append(c)
        i += 1
    elif c == ")":
        while op and op[-1] != "(":
            post.append(op.pop())
        op.pop()
        i += 1
    else:
        while op and op[-1] != "(" and prec(op[-1]) >= prec(c):
            post.append(op.pop())
        op.append(c)
        i += 1
while op:
    post.append(op.pop())
print("中缀：%s" % expr)
print("后缀：", *post)

val = []
for tok in post:
    if tok.isdigit():
        val.append(int(tok))
    else:
        b, a = val.pop(), val.pop()
        val.append(a + b if tok == "+" else a - b if tok == "-" else
                   a * b if tok == "*" else a // b)
print("求值结果 = %d（12 + 3*2/2 = 15）" % val[0])
`,
  },
  '哈夫曼树与编码（数组建树）': {
    group: '树',
    stdin: '',
    code: `# 节点放列表里，用下标当「指针」，每次挑两个还没父节点的最小权节点合并。
n = 6
ch = list("ABCDEF")
freq = [45, 13, 12, 16, 9, 5]
w = freq[:] + [0] * (n - 1)
parent = [0] * (2 * n - 1)
lch = [-1] * (2 * n - 1)
rch = [-1] * (2 * n - 1)

for k in range(n, 2 * n - 1):
    cand = sorted((i for i in range(k) if parent[i] == 0), key=lambda i: w[i])
    m1, m2 = cand[0], cand[1]
    w[k] = w[m1] + w[m2]
    lch[k], rch[k] = m1, m2
    parent[m1] = parent[m2] = k
    print("  合并 %d + %d = %d（新节点下标 %d）" % (w[m1], w[m2], w[k], k))
root = 2 * n - 2
print("根节点下标 %d，总权值 WPL 下界 = %d\\n" % (root, w[root]))

wpl = 0
print("哈夫曼编码（左 0 右 1，从叶子往根倒推）：")
for i in range(n):
    bits, p = [], i
    while parent[p] != 0:
        par = parent[p]
        bits.append("0" if lch[par] == p else "1")
        p = par
    code = "".join(reversed(bits))
    print("  %c(%2d) : %-8s 长度 %d" % (ch[i], freq[i], code, len(code)))
    wpl += freq[i] * len(code)
print("带权路径长度 WPL = %d" % wpl)
`,
  },
  '数组邻接表（前向星）与迭代遍历': {
    group: '图',
    stdin: '',
    code: `# 不用 dict of list：head / to / nxt 三条列表就是邻接表（前向星）。
n = 7
head = [-1] * n
to, nxt = [], []
edges = [(0, 1), (0, 2), (1, 3), (1, 4), (2, 4), (2, 5), (3, 6), (4, 6), (5, 6)]

def add(u, v):
    to.append(v)
    nxt.append(head[u])
    head[u] = len(to) - 1

for u, v in edges:
    add(u, v)
    add(v, u)

print("前向星（head / to / nxt 三条数组）：")
for u in range(n):
    out, e = [], head[u]
    while e != -1:
        out.append(to[e])
        e = nxt[e]
    print("  %d:" % u, *out)

vis = [False] * n
vis[0] = True
st = [0]
order = []
while st:
    u = st.pop()
    order.append(u)
    e = head[u]
    while e != -1:
        v = to[e]
        if not vis[v]:
            vis[v] = True
            st.append(v)
        e = nxt[e]
print("\\n迭代 DFS：", *order)

vis = [False] * n
vis[0] = True
q = [0]
order = []
while q:
    u = q.pop(0)
    order.append(u)
    e = head[u]
    while e != -1:
        v = to[e]
        if not vis[v]:
            vis[v] = True
            q.append(v)
        e = nxt[e]
print("迭代 BFS：", *order)
`,
  },
  '邻接矩阵 + Floyd 全源最短路': {
    group: '图',
    stdin: '',
    code: `# Floyd：中转点 k 必须放在最外层，三重循环，O(n^3)，能算任意两点最短路。
n, inf = 5, 10 ** 6
d = [[0 if i == j else inf for j in range(n)] for i in range(n)]
for u, v, w in [(0, 1, 4), (0, 2, 1), (2, 1, 2), (1, 3, 1),
                (2, 3, 5), (3, 4, 3), (0, 3, 100)]:
    d[u][v] = w

relax = 0
for k in range(n):
    for i in range(n):
        for j in range(n):
            if d[i][k] + d[k][j] < d[i][j]:
                d[i][j] = d[i][k] + d[k][j]
                relax += 1
print("Floyd 松弛 %d 次，最终距离矩阵（INF 记 -1）：" % relax)
print("      " + "".join("%4d" % j for j in range(n)))
for i in range(n):
    print("  %d:  " % i + "".join("%4d" % (-1 if x >= inf else x) for x in d[i]))
print("\\n0 -> 3 = %d（直达边是 100，绕 0->2->1->3 只要 4）" % d[0][3])
print("0 -> 4 = %d" % d[0][4])
`,
  },
  '拓扑排序（Kahn 数组队列）': {
    group: '图',
    stdin: '',
    code: `# Kahn：入度为 0 的点入队，出队时把后继入度减一；出队数不足即有环。
n = 7
edges = [(0, 1), (0, 2), (1, 3), (2, 3), (3, 4), (2, 5), (5, 6), (4, 6)]
adj = [[] for _ in range(n)]
indeg = [0] * n
for u, v in edges:
    adj[u].insert(0, v)          # 头插，和 C++ 前向星的邻接顺序保持一致
    indeg[v] += 1
print("各点入度：", *indeg)

q = [i for i in range(n) if indeg[i] == 0]
order = []
while q:
    u = q.pop(0)
    order.append(u)
    for v in adj[u]:
        indeg[v] -= 1
        if indeg[v] == 0:
            q.append(v)
print("拓扑序：", *order)
print("出队 %d 个点，%s" % (len(order), "无环" if len(order) == n else "有环（剩下的点构成环）"))

indeg2 = [1, 1, 1, 2, 1, 1, 2]     # 再加一条 6->0 造环
q = [i for i in range(n) if indeg2[i] == 0]
order = []
while q:
    u = q.pop(0)
    order.append(u)
    for v in adj[u]:
        indeg2[v] -= 1
        if indeg2[v] == 0:
            q.append(v)
    if u == 6:
        indeg2[0] -= 1
        if indeg2[0] == 0:
            q.append(0)
print("加一条 6->0 后只排出 %d 个点 -> 检测到环" % len(order))
`,
  },
  '最小生成树：Prim + Kruskal': {
    group: '图',
    stdin: '',
    code: `# Prim 从点长树，Kruskal 按边权贪心 + 并查集；两者结果必须一致。
n = 6
edges = [(0, 1, 4), (0, 2, 2), (1, 2, 1), (1, 3, 5), (2, 3, 8),
         (2, 4, 10), (3, 4, 2), (3, 5, 6), (4, 5, 3)]
inf = 10 ** 6
g = [[inf] * n for _ in range(n)]
for u, v, w in edges:
    g[u][v] = g[v][u] = w

low = g[0][:]
used = [False] * n
used[0] = True
cost = 0
print("Prim 依次选边：")
for k in range(1, n):
    v = min((i for i in range(n) if not used[i]), key=lambda i: low[i])
    print("  0..%d 树接到 %d，边权 %d" % (k - 1, v, low[v]))
    cost += low[v]
    used[v] = True
    for i in range(n):
        if not used[i] and g[v][i] < low[i]:
            low[i] = g[v][i]
print("Prim 总权值 = %d\\n" % cost)

fa = list(range(n))
def find(x):
    while fa[x] != x:
        fa[x] = fa[fa[x]]
        x = fa[x]
    return x

cost = 0
cnt = 0
print("Kruskal 依次选边：")
for u, v, w in sorted(edges, key=lambda e: e[2]):
    ru, rv = find(u), find(v)
    if ru != rv:
        fa[rv] = ru
        print("  %d-%d(%d)" % (u, v, w))
        cost += w
        cnt += 1
        if cnt == n - 1:
            break
print("Kruskal 总权值 = %d（应与 Prim 相等）" % cost)
`,
  },
  '散列表：开放定址线性探测': {
    group: '查找与字符串',
    stdin: '',
    code: `# 不挂链：冲突就往后找空位。删除要留「墓碑」，否则会截断探测链。
CAP = 11
key_tab = [0] * CAP
val_tab = [0] * CAP
state = [0] * CAP          # 0 空 / 1 占用 / 2 墓碑

def insert_linear(k, v):
    for i in range(CAP):
        p = (k + i) % CAP
        if state[p] == 1:
            if key_tab[p] == k:
                val_tab[p] = v
                return i + 1
            continue
        key_tab[p], val_tab[p], state[p] = k, v, 1
        return i + 1
    return -1

def find_key(k):
    for i in range(CAP):
        p = (k + i) % CAP
        if state[p] == 0:
            return None
        if state[p] == 1 and key_tab[p] == k:
            return val_tab[p], i + 1
    return None

print("插入（线性探测，CAP=%d）：" % CAP)
for k in [12, 23, 34, 45, 56, 67, 78]:
    probes = insert_linear(k, k * 10)
    print("  key=%2d h=%2d 探测 %d 次 -> 实际下标 %d" % (k, k % CAP, probes, (k % CAP + probes - 1) % CAP))
print("\\n表内容：")
for i in range(CAP):
    print("  [%2d] %s" % (i, "占用" if state[i] == 1 else "墓碑" if state[i] == 2 else "空"))
print("\\n查找：")
for k in [34, 67, 99]:
    got = find_key(k)
    print("  key=%d -> %s（探测 %d 次）" % (k, "找到" if got else "查无此键", got[1] if got else CAP))
`,
  },
  'Trie 字典树（二维数组）': {
    group: '查找与字符串',
    stdin: '',
    code: `# 每个节点的孩子放定长列表 nxt[节点号][字母]，-1 表示没有这条边。
nxt = [[-1] * 26 for _ in range(64)]
is_end = [0] * 64
pass_cnt = [0] * 64
nodes = 1

def insert(s):
    global nodes
    p = 0
    for ch in s:
        c = ord(ch) - 97
        if nxt[p][c] == -1:
            nxt[p][c] = nodes
            nodes += 1
        p = nxt[p][c]
        pass_cnt[p] += 1
    is_end[p] = 1

def find(s):
    p = 0
    for ch in s:
        c = ord(ch) - 97
        if nxt[p][c] == -1:
            return False, 0
        p = nxt[p][c]
    return is_end[p] == 1, pass_cnt[p]

for w in ["to", "tea", "ted", "ten", "in", "inn"]:
    insert(w)
print("插入 6 个单词，共用 %d 个节点（前缀共享节点，所以远少于字母总数）" % nodes)
print("根节点的出边：", *(chr(97 + c) for c in range(26) if nxt[0][c] != -1), "\\n")
for q in ["tea", "te", "ten", "inn", "toe"]:
    whole, passes = find(q)
    print("  查 %-4s：%s，经过该前缀的单词 %d 个" %
          (q, "是完整单词" if whole else "只是前缀/不存在" if passes else "不存在", passes))
print("\\n注意 te 不是完整单词但 te 前缀下有 3 个单词，这正是前缀统计的用法。")
`,
  },
  'Rabin-Karp 滚动哈希匹配': {
    group: '查找与字符串',
    stdin: '',
    code: `# 把串看成 131 进制数，窗口右移时 O(1) 更新哈希；哈希相等再逐字符核对。
text = "abababcaabababcab"
pat = "ababc"
n, m = len(text), len(pat)
BASE = 131
pw = BASE ** (m - 1)
hp = sum(ord(c) * BASE ** (m - 1 - i) for i, c in enumerate(pat))
ht = sum(ord(c) * BASE ** (m - 1 - i) for i, c in enumerate(text[:m]))

print("文本：%s\\n模式：%s（长度 %d）" % (text, pat, m))
hits, verified = [], 0
for i in range(n - m + 1):
    if ht == hp:
        verified += 1
        if text[i:i + m] == pat:
            hits.append(i)
    if i + m < n:
        ht = (ht - ord(text[i]) * pw) * BASE + ord(text[i + m])
print("RK 命中位置：", *hits, "（哈希比对 %d 次）" % verified)
print("朴素匹配：", *(i for i in range(n - m + 1) if text[i:i + m] == pat))
print("两种结果应当一致；平均 O(n+m)，最坏仍 O(nm)。")
`,
  },
  '01 背包（一维滚动数组）': {
    group: '动态规划',
    stdin: '',
    code: `# dp[c] = 容量 c 下最大价值；容量必须倒着枚举，否则同一件物品会被重复放。
n, CAP = 5, 12
w = [2, 3, 4, 5, 9]
v = [3, 4, 5, 8, 10]
name = list("ABCDE")
dp = [0] * (CAP + 1)
pick = [[0] * (CAP + 1) for _ in range(n)]

for i in range(n):
    for c in range(CAP, w[i] - 1, -1):
        cand = dp[c - w[i]] + v[i]
        if cand > dp[c]:
            dp[c] = cand
            pick[i][c] = 1
print("容量 0..%d 的最优值：" % CAP, *dp)
print("最大价值 = %d" % dp[CAP])

c = CAP
chosen = []
for i in range(n - 1, -1, -1):
    if pick[i][c]:
        chosen.append(name[i])
        c -= w[i]
print("选取方案（倒推）：", *chosen)
print("剩余容量 %d；总重 %d，总价值 %d" % (c, CAP - c, dp[CAP]))
`,
  },
  '完全背包 + 零钱兑换': {
    group: '动态规划',
    stdin: '',
    code: `# 完全背包容量正着枚举（可无限取同一件）；零钱兑换把最大值换成最少枚数。
CAP = 11
coin = [1, 3, 4]
best = [0] * (CAP + 1)
for x in coin:
    for c in range(x, CAP + 1):
        best[c] = max(best[c], best[c - x] + x)
print("面额 {1,3,4}，凑出 0..%d 能凑到的最大金额：" % CAP)
print("  ", *best)
print("  （每个值都等于金额本身说明都能凑齐）\\n")

INF = 10 ** 6
cnt = [INF] * (CAP + 1)
first = [-1] * (CAP + 1)
cnt[0] = 0
for x in coin:
    for c in range(x, CAP + 1):
        if cnt[c - x] + 1 < cnt[c]:
            cnt[c] = cnt[c - x] + 1
            first[c] = x
print("凑 11 的最少硬币数 = %d，方案：" % cnt[CAP], end=" ")
c = CAP
while c > 0:
    print(first[c], end=" ")
    c -= first[c]
print("\\ncnt 数组（最少枚数）：", *(-1 if x >= INF else x for x in cnt))
`,
  },
  '最长公共子序列 LCS（二维 dp）': {
    group: '动态规划',
    stdin: '',
    code: `# dp[i][j] = a 前 i 个与 b 前 j 个的 LCS 长度，再从右下角回走还原序列。
a, b = "ABCBDAB", "BDCABA"
n, m = len(a), len(b)
dp = [[0] * (m + 1) for _ in range(n + 1)]
for i in range(1, n + 1):
    for j in range(1, m + 1):
        dp[i][j] = dp[i - 1][j - 1] + 1 if a[i - 1] == b[j - 1] else max(dp[i - 1][j], dp[i][j - 1])
print("a = %s\\nb = %s\\nLCS 长度 = %d" % (a, b, dp[n][m]))

i, j = n, m
lcs = []
while i > 0 and j > 0:
    if a[i - 1] == b[j - 1]:
        lcs.append(a[i - 1])
        i -= 1
        j -= 1
    elif dp[i - 1][j] >= dp[i][j - 1]:
        i -= 1
    else:
        j -= 1
print("还原出的一个 LCS = %s\\n" % "".join(reversed(lcs)))
print("dp 表（行 a，列 b）：")
print("    " + "".join("%2c" % c for c in b))
for i in range(n + 1):
    print("%2c " % (a[i - 1] if i else " ") + "".join("%2d" % x for x in dp[i]))
`,
  },
  '最长上升子序列 LIS 与方案还原': {
    group: '动态规划',
    stdin: '',
    code: `# dp[i] = 以 a[i] 结尾的 LIS 长度，pre[i] 记前驱下标，倒着走还原方案。
a = [2, 5, 1, 7, 3, 4, 8, 6, 9, 0]
n = len(a)
dp = [1] * n
pre = [-1] * n
best_len, best_end = 1, 0
for i in range(n):
    for j in range(i):
        if a[j] < a[i] and dp[j] + 1 > dp[i]:
            dp[i] = dp[j] + 1
            pre[i] = j
    if dp[i] > best_len:
        best_len, best_end = dp[i], i
print("数组：", *a)
print("以各位置结尾的 LIS 长度：", *dp)
print("LIS 长度 = %d" % best_len)
chain = []
p = best_end
while p != -1:
    chain.append(a[p])
    p = pre[p]
print("还原一条 LIS：", *reversed(chain))
print("（严格上升，pre[] 存的是前驱下标）")
`,
  },
  '编辑距离（二维 dp）': {
    group: '动态规划',
    stdin: '',
    code: `# dp[i][j] = a 前 i 个字符变 b 前 j 个字符的最少插入/删除/替换次数。
a, b = "kitten", "sitting"
n, m = len(a), len(b)
dp = [[0] * (m + 1) for _ in range(n + 1)]
for i in range(n + 1):
    dp[i][0] = i
for j in range(m + 1):
    dp[0][j] = j
for i in range(1, n + 1):
    for j in range(1, m + 1):
        dp[i][j] = dp[i - 1][j - 1] if a[i - 1] == b[j - 1] else 1 + min(
            dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

print("%s -> %s\\n编辑距离 = %d" % (a, b, dp[n][m]))
print("（k->s 替换、e->i 替换、末尾插 g，共 3 步）\\n")
print("dp 表：")
print("    " + "".join("%2c" % c for c in b))
for i in range(n + 1):
    print("%2c " % (a[i - 1] if i else " ") + "".join("%2d" % x for x in dp[i]))
`,
  },
  '全排列与组合（used 数组回溯）': {
    group: '回溯',
    stdin: '',
    code: `# 回溯：做选择 -> 递归 -> 撤销。used 标已选，path 是当前前缀。
count = 0
path = []

def permute(used, n):
    global count
    if len(path) == n:
        if count < 6:
            print("  ", *path)
        count += 1
        return
    for i in range(n):
        if used[i]:
            continue
        used[i] = 1
        path.append(i + 1)
        permute(used, n)
        path.pop()
        used[i] = 0

print("{1,2,3} 的全排列（只列前 6 个）：")
permute([0] * 3, 3)
print("共 %d 个 = 3!\\n" % count)

count = 0
path = []
def combine(start, n, k):
    global count
    if len(path) == k:
        if count < 6:
            print("  ", *path)
        count += 1
        return
    for i in range(start, n + 1):
        path.append(i)
        combine(i + 1, n, k)
        path.pop()

print("从 {1,2,3,4,5} 取 3 个的组合（只列前 6 个）：")
combine(1, 5, 3)
print("共 %d 个 = C(5,3) = 10" % count)
`,
  },
  '八皇后（列与对角线标记数组）': {
    group: '回溯',
    stdin: '',
    code: `# 逐行放皇后：col 管列，d1/d2 管两条对角线，冲突判断 O(1)。
N = 8
col = [0] * N
d1 = [0] * (2 * N)
d2 = [0] * (2 * N)
pos = [0] * N
solutions, shown = 0, 0

def dfs(row):
    global solutions, shown
    if row == N:
        solutions += 1
        if shown < 3:
            print("  解 %d：" % solutions, *(c + 1 for c in pos), "（每项是第 r 行皇后所在的列）")
            shown += 1
        return
    for c in range(N):
        a, b = row + c, row - c + N
        if col[c] or d1[a] or d2[b]:
            continue
        col[c] = d1[a] = d2[b] = 1
        pos[row] = c
        dfs(row + 1)
        col[c] = d1[a] = d2[b] = 0

dfs(0)
print("八皇后共有 %d 个解（N=%d）" % (solutions, N))
print("时间复杂度是搜索树规模，靠三个标记数组把每步冲突判断压到 O(1)")
`,
  },
  '贪心：活动选择与找零钱': {
    group: '贪心',
    stdin: '',
    code: `# 活动选择按结束时间升序（最早结束最优）；找零钱面额降序，但只对规范币制最优。
acts = [[1, 3, 1], [2, 5, 2], [3, 7, 3], [0, 4, 4], [5, 9, 5], [8, 10, 6]]
for i in range(len(acts) - 1):
    m = min(range(i, len(acts)), key=lambda j: acts[j][1])
    acts[i], acts[m] = acts[m], acts[i]
print("按结束时间排序：")
for s, e, idx in acts:
    print("  活动 %d: [%d,%d)" % (idx, s, e))
chosen, last_end = [], -1
for s, e, idx in acts:
    if s >= last_end:
        chosen.append(idx)
        last_end = e
print("最多能安排 %d 个活动：" % len(chosen), *chosen, "\\n")

coin = [25, 10, 5, 1]
amount, rest = 67, 67
parts = []
for c in coin:
    n, rest = divmod(rest, c)
    if n:
        parts.append("%d x %d" % (c, n))
print("用 {25,10,5,1} 凑 %d：" % amount, "  ".join(parts))
print("共 %d 枚，剩余 %d" % (sum(int(p.split(" x ")[1]) for p in parts), rest))
print("注意换成 {1,3,4} 凑 6 时贪心会给 4+1+1，而最优是 3+3 —— 该用 DP。")
`,
  },
  '素数筛：埃氏筛与欧拉筛': {
    group: '数学与位运算',
    stdin: '',
    code: `# 埃氏筛划倍数（合数可能被划多次）；欧拉筛每个合数只被最小质因子划一次。
N = 50
comp_a = [False] * (N + 1)
marks_a = 0
for i in range(2, N + 1):
    if not comp_a[i]:
        for j in range(i * i, N + 1, i):
            comp_a[j] = True
            marks_a += 1

comp_b = [False] * (N + 1)
primes, marks_b = [], 0
for i in range(2, N + 1):
    if not comp_b[i]:
        primes.append(i)
    for p in primes:
        if i * p > N:
            break
        comp_b[i * p] = True
        marks_b += 1
        if i % p == 0:
            break
print("50 以内的素数（%d 个）：" % len(primes), *primes)
print("\\n埃氏筛打标记 %d 次，欧拉筛打标记 %d 次" % (marks_a, marks_b))
print("欧拉筛每个合数只标一次，共 %d 个合数 -> 严格 O(n)" % (N - 1 - len(primes)))
`,
  },
  '辗转相除 / 扩展欧几里得 / 快速幂': {
    group: '数学与位运算',
    stdin: '',
    code: `# 三个数论基本件：辗转相除、扩展欧几里得（回代求 x,y）、按二进制位的快速幂。
def gcd(a, b):
    return a if b == 0 else gcd(b, a % b)

def exgcd(a, b):
    if b == 0:
        return a, 1, 0
    g, x1, y1 = exgcd(b, a % b)
    return g, y1, x1 - (a // b) * y1

def mod_pow(a, e, mod):
    r = 1 % mod
    while e > 0:
        if e & 1:
            r = r * a % mod
        a = a * a % mod
        e >>= 1
    return r

print("gcd(1071, 462) =", gcd(1071, 462))
print("lcm(1071, 462) =", 1071 // gcd(1071, 462) * 462, "\\n")
g, x, y = exgcd(35, 15)
print("exgcd(35, 15)：gcd = %d，35*%d + 15*%d = %d" % (g, x, y, 35 * x + 15 * y))
print("验算：%d = %d\\n" % (35 * x + 15 * y, g))
print("2^10 mod 1000 =", mod_pow(2, 10, 1000))
print("3^13 mod 97   =", mod_pow(3, 13, 97))
print("7^0 mod 5     =", mod_pow(7, 0, 5))
`,
  },
  '大整数阶乘（数组存十进制位）': {
    group: '数学与位运算',
    stdin: '',
    code: `# Python 的 int 自带大数，这里照样用数组按十进制位存一遍，和 C++ 版逐步对照。
digits = [1]            # digits[0] 是个位
for k in range(2, 31):
    carry = 0
    for i in range(len(digits)):
        t = digits[i] * k + carry
        digits[i], carry = t % 10, t // 10
    while carry:
        digits.append(carry % 10)
        carry //= 10
    if k in (5, 10, 20, 30):
        print("  %2d! 已有 %d 位" % (k, len(digits)))
print("\\n30! =", "".join(str(d) for d in reversed(digits)))
print("共 %d 位（30! = 265252859812191058636308480000000，可手算核对）" % len(digits))
`,
  },
  '树状数组（lowbit 前缀和）': {
    group: '高级数据结构',
    stdin: '',
    code: `# bit[i] 管 [i-lowbit(i)+1, i]：查询往前跳，单点加往后跳，都是 O(log n)。
n = 8
a = [0, 3, 1, 4, 1, 5, 9, 2, 6]
bit = [0] * (n + 1)

def lowbit(x):
    return x & -x

def add(i, delta):
    while i <= n:
        bit[i] += delta
        i += lowbit(i)

def prefix_sum(i):
    s = 0
    while i > 0:
        s += bit[i]
        i -= lowbit(i)
    return s

for i in range(1, n + 1):
    add(i, a[i])
print("原数组（1-based）：", *a[1:])
print("bit 数组：", *bit[1:])
print("\\n前缀和前 6 项 = %d（3+1+4+1+5+9 = 23）" % prefix_sum(6))
print("区间 [3,7] 之和 = prefix(7)-prefix(2) = %d" % (prefix_sum(7) - prefix_sum(2)))

add(4, 10)
print("\\n第 4 项加 10 后：")
print("  区间 [3,7] = %d（应增加 10）" % (prefix_sum(7) - prefix_sum(2)))
print("  bit 数组：", *bit[1:])
print("  （只有下标 4、8 变了，这就是 O(log n)）")
`,
  },
  '线段树（4n 数组区间和）': {
    group: '高级数据结构',
    stdin: '',
    code: `# 节点 p 的左右孩子是 2p / 2p+1，开 4n 大小的列表即可，递归 O(log n)。
n = 8
arr = [0, 3, 1, 4, 1, 5, 9, 2, 6]
tree = [0] * (4 * n)

def build(p, l, r):
    if l == r:
        tree[p] = arr[l]
        return
    m = (l + r) // 2
    build(p * 2, l, m)
    build(p * 2 + 1, m + 1, r)
    tree[p] = tree[p * 2] + tree[p * 2 + 1]

def query(p, l, r, ql, qr):
    if ql <= l and r <= qr:
        return tree[p]
    m = (l + r) // 2
    s = 0
    if ql <= m:
        s += query(p * 2, l, m, ql, qr)
    if qr > m:
        s += query(p * 2 + 1, m + 1, r, ql, qr)
    return s

def update(p, l, r, idx, delta):
    if l == r:
        tree[p] += delta
        return
    m = (l + r) // 2
    if idx <= m:
        update(p * 2, l, m, idx, delta)
    else:
        update(p * 2 + 1, m + 1, r, idx, delta)
    tree[p] = tree[p * 2] + tree[p * 2 + 1]

build(1, 1, n)
print("原数组：", *arr[1:])
print("根节点 tree[1] = %d（总和 31）" % tree[1])
print("tree 数组前 15 格：", *tree[1:16])
print("\\n区间 [3,7] 之和 =", query(1, 1, n, 3, 7))
print("区间 [1,8] 之和 =", query(1, 1, n, 1, 8))
print("区间 [6,6] 之和 =", query(1, 1, n, 6, 6), "\\n")
update(1, 1, n, 4, 10)
arr[4] += 10
print("第 4 项加 10 后：")
print("  根 = %d，区间 [3,7] = %d，朴素核对 = %d" %
      (tree[1], query(1, 1, n, 3, 7), sum(arr[3:8])))
`,
  },
};
