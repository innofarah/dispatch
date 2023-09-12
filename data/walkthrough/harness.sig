sig harness.

type config_agent,
     config_language,
     config_tool               string -> o.
type name                      string -> o -> o.

type openOutput,
     openInput                 string -> string -> o -> o.
type pprint,
     rread                     string -> o.
type eeof,
     closeOut,
     closeIn                   o.
type json                      string -> o.

type print_assertions_loop     o.
type print_named_loop          string -> o.
type pprintterm,
     rreadterm                 o -> o.

type print_lines               o.
type print_sig, print_mod      string -> o.

type print_preamble,
     print_assertions,
     print_named,
     print_context             string -> o.

type remove_nl                 string -> string -> o.
