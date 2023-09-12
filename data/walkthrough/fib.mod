module fib.
plus z X X.
plus (s X) Y (s Z) :- plus X Y Z.
times z X z.
times (s X) Y Z :- times X Y U, plus Y U Z.
fib z z.
fib (s z) (s z).
fib (s (s X)) Y :- fib (s X) U, fib X V, plus U V Y.