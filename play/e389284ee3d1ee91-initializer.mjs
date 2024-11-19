export default function myInitializer() {
  return {
    onStart: () => {
      console.log("Loading...");
      console.time("trunk-initializer");
    },
    onProgress: ({ current, total }) => {
      if (!total) {
        console.log("Loading...", current, "bytes");
      } else {
        console.log("Loading...", Math.round((current / total) * 100), "%")
      }
    },
    onComplete: () => {
      console.log("Loading... done!");
      console.timeEnd("trunk-initializer");
    },
    onSuccess: (wasm) => {
      console.log("Loading... successful!");
      console.log("WebAssembly: ", wasm);

      document.getElementById("run-button").onclick = function () {
        document.getElementById("output").innerText = "";
        let source = window.editor.getValue();
        let kast = new window.wasmBindings.Kast();
        function output(s) {
          document.getElementById("output").innerText += s;
        }
        kast.set_output(output);
        try {
          kast.eval(source);
        } catch (e) {
          output(`${e}`);
        }
      }
    },
    onFailure: (error) => {
      console.warn("Loading... failed!", error);
    }
  }
};

// window.write_stdout = function(s) {
//   console.log(s);
// };
//
// Kast = wasmBindings.Kast;
//
// var kast = new Kast();
// kast.eval("std.dbg ()");
