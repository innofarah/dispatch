module fib.

plus z N N.
plus (s N) M (s P) :- plus N M P.

fib z z.
fib (s z) (s z).
fib (s (s N)) F :- fib N F1, fib (s N) F2, plus F1 F2 F.