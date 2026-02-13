---
title: Arrays
description: Idiomatic sequence operations in Python lists, Rust vectors, and Go slices.
---

## Mental Model

- Python `list`, Rust `Vec<T>`, and Go `[]T` are dynamic arrays.
- They provide O(1) index access and amortized O(1) append.
- Middle insert/delete requires shifting elements: O(n).

## Creation, Access, Update

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
nums = [10, 20, 30]
first = nums[0]
last = nums[-1]
nums[1] = 25

print(first, last, nums)  # 10 30 [10, 25, 30]
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let mut nums = vec![10, 20, 30];
    let first = nums[0];
    let last = nums[nums.len() - 1];
    nums[1] = 25;

    println!("{} {} {:?}", first, last, nums); // 10 30 [10, 25, 30]
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    nums := []int{10, 20, 30}
    first := nums[0]
    last := nums[len(nums)-1]
    nums[1] = 25

    fmt.Println(first, last, nums) // 10 30 [10 25 30]
}
```

</div>
</div>

## Append, Insert, Remove

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
nums = [10, 20, 30]
nums.append(40)        # [10, 20, 30, 40]
nums.insert(1, 15)     # [10, 15, 20, 30, 40]
del nums[2]            # [10, 15, 30, 40]

print(nums)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let mut nums = vec![10, 20, 30];
    nums.push(40);      // [10, 20, 30, 40]
    nums.insert(1, 15); // [10, 15, 20, 30, 40]
    nums.remove(2);     // [10, 15, 30, 40]

    println!("{:?}", nums);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    nums := []int{10, 20, 30}
    nums = append(nums, 40)

    // Insert 15 at index 1.
    nums = append(nums[:1], append([]int{15}, nums[1:]...)...)

    // Remove index 2.
    idx := 2
    nums = append(nums[:idx], nums[idx+1:]...)

    fmt.Println(nums) // [10 15 30 40]
}
```

</div>
</div>

## Iteration, Filtering, Mapping

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
nums = [1, 2, 3, 4, 5]

evens = [x for x in nums if x % 2 == 0]
squares = [x * x for x in nums]

for i, v in enumerate(nums):
    print(i, v)

print(evens, squares)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let nums = vec![1, 2, 3, 4, 5];

    let evens: Vec<i32> = nums.iter().copied().filter(|x| x % 2 == 0).collect();
    let squares: Vec<i32> = nums.iter().map(|x| x * x).collect();

    for (i, v) in nums.iter().enumerate() {
        println!("{} {}", i, v);
    }

    println!("{:?} {:?}", evens, squares);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    nums := []int{1, 2, 3, 4, 5}

    evens := []int{}
    squares := make([]int, 0, len(nums))

    for i, v := range nums {
        fmt.Println(i, v)
        if v%2 == 0 {
            evens = append(evens, v)
        }
        squares = append(squares, v*v)
    }

    fmt.Println(evens, squares)
}
```

</div>
</div>

## Sorting

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
words = ["pear", "apple", "banana"]
words.sort()  # in-place

records = [{"name": "ann", "score": 90}, {"name": "bob", "score": 85}]
records.sort(key=lambda r: r["score"], reverse=True)

print(words)
print(records)
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
fn main() {
    let mut words = vec!["pear", "apple", "banana"];
    words.sort(); // in-place

    let mut nums = vec![5, 1, 4, 2];
    nums.sort_by(|a, b| b.cmp(a)); // descending

    println!("{:?}", words);
    println!("{:?}", nums);
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import (
    "cmp"
    "fmt"
    "slices"
)

func main() {
    words := []string{"pear", "apple", "banana"}
    slices.Sort(words)

    nums := []int{5, 1, 4, 2}
    slices.SortFunc(nums, func(a, b int) int {
        return cmp.Compare(b, a) // descending
    })

    fmt.Println(words)
    fmt.Println(nums)
}
```

</div>
</div>

## Stack and Queue Patterns

<div class="code-tabs">
<div class="tab-panel" data-lang="python" markdown="1">

```python
from collections import deque

stack = []
stack.append(10)
stack.append(20)
print(stack.pop())  # 20

queue = deque([1, 2, 3])
queue.append(4)
print(queue.popleft())  # 1
```

</div>
<div class="tab-panel" data-lang="rust" markdown="1">

```rust
use std::collections::VecDeque;

fn main() {
    let mut stack = vec![];
    stack.push(10);
    stack.push(20);
    println!("{:?}", stack.pop()); // Some(20)

    let mut queue = VecDeque::from([1, 2, 3]);
    queue.push_back(4);
    println!("{:?}", queue.pop_front()); // Some(1)
}
```

</div>
<div class="tab-panel" data-lang="go" markdown="1">

```go
package main

import "fmt"

func main() {
    stack := []int{}
    stack = append(stack, 10, 20)
    top := stack[len(stack)-1]
    stack = stack[:len(stack)-1]
    fmt.Println(top) // 20

    queue := []int{1, 2, 3}
    queue = append(queue, 4)
    front := queue[0]
    queue = queue[1:]
    fmt.Println(front) // 1
}
```

</div>
</div>

## Complexity (Dynamic Arrays)

| Operation | Average | Worst | Notes |
| --- | --- | --- | --- |
| Index read/write | O(1) | O(1) | Direct offset access |
| Append at end | O(1) amortized | O(n) | Resize/copy on capacity growth |
| Insert/delete middle | O(n) | O(n) | Shift elements |
| Search unsorted | O(n) | O(n) | Linear scan |
