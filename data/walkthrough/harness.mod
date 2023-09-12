module harness.

type if   o -> o -> o -> o.
if P Q R :- P, !, Q.
if P Q R :- R.

% Configure the user profile name and the name of the language
config_agent    "exampleAgent".
config_language "lprolog".
config_tool     "teyjus-2.1.1".

% Specialize the file input and output functions.

openOutput File Ext Goal :- OutFile is (File ^ Ext), open_out OutFile Out,
  (pi Term\ pi String\ pprintterm Term :- term_to_string Term String, output Out String) =>
  (pi String\ pprint String :- output Out String) =>
  (closeOut :- close_out Out) => Goal,
  print "Wrote ", print OutFile, print ".\n".

openInput File Ext Goal :- InFile is (File ^ Ext), open_in InFile In,
  (pi String\ rread String :- input_line In String) =>
  (pi Term\ rreadterm Term :- readterm In Term) =>
  (eeof :- eof In) => (closeIn :- close_in In) => Goal.

% The top-level command.  See comments in the harness.sig file.

json File :- openOutput File ".json" (
  print_preamble File,
  print_assertions File,
  print_named File,
  print_context File,
  closeOut), !.

print_preamble File :-
  pprint "{\n",
  pprint "  \"format\": \"collection\",\n",
  pprint "  \"name\": \"", pprint File, pprint "\",\n".

print_assertions File :-
  pprint "  \"elements\": [\n",
  openInput File ".goals" (print_assertions_loop, closeIn, pprint "  ],\n").

print_assertions_loop :- eeof, !.
print_assertions_loop :-
  config_agent Agent, config_tool Tool,
  rreadterm (name String _),
  pprint "   {\n",
  pprint "     \"format\": \"assertion\",\n",
  pprint "     \"element\": {\n",
  pprint "       \"agent\": \"", pprint Agent, pprint "\",\n",
  pprint "       \"claim\": {\n",
  pprint "         \"format\": \"annotated-production\",\n",
  pprint "         \"annotation\": { \"name\": \"", pprint String, pprint "\" },\n",
  pprint "         \"production\": {\n",
  pprint "           \"mode\": \"", pprint Tool, pprint "\",\n",
  pprint "           \"sequent\": {\n",
  pprint "             \"conclusion\": \"", pprint String, pprint "\",\n",
  pprint "             \"dependencies\": [ ]\n",
  pprint "           }\n",
  pprint "         }\n",
  pprint "       }\n",
  pprint "     }\n",
  pprint "   }", eeof, pprint "\n", !.
print_assertions_loop :- pprint ",\n", print_assertions_loop.

print_named File :-
  pprint "  \"formulas\": {\n",
  openInput File ".goals" (print_named_loop File, closeIn, pprint "\n  },\n").

print_named_loop _ :- eeof, !.
print_named_loop File :-
  term_to_string File FStr,
  rreadterm (name Name Goal),
  Goal,  % <--- Theorem proving done here
  term_to_string Goal GStr,
  pprint "    \"", pprint Name, pprint "\": {\n",
  config_language Language,
  pprint "      \"language\": \"", pprint Language, pprint "\",\n",
  pprint "      \"content\": \"", pprint GStr, pprint "\",\n",
  pprint "      \"context\": [ ", pprint FStr, pprint " ]\n",
  pprint "    }", eeof, pprint "\n", !.
print_named_loop File :- pprint ",\n", print_named_loop File.

print_context File :-
  config_language Language,
  pprint "  \"contexts\": {\n",
  pprint "    \"", pprint File, pprint "\": {\n",
  pprint "      \"language\": \"", pprint Language, pprint "\",\n",
  pprint "      \"content\": [\n", print_sig File, pprint "\n",
  pprint "      ]\n",
  pprint "    }\n",
  pprint "  }\n",
  pprint "}\n".

% The following two predicates will dump together the .sig file and .mod file.
% The first line in each file is ignored as are completely empty lines.
print_sig File :- openInput File ".sig" (rread _, print_lines, closeIn).
print_mod File :- openInput File ".mod" (rread _, print_lines, closeIn).

print_lines :- eeof.
print_lines :- rread Line, remove_nl Line L,
               if (L = "") print_lines (term_to_string L S, pprint "        ", pprint S), eeof, !.
print_lines :- pprint ",\n", print_lines.

% Remove the one trailing newline, if any.
remove_nl S T :- C is ((size S) - 1), "\n" is (substring S C 1), !, T is (substring S 0 C).
remove_nl S S.
