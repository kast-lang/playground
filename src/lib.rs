use kast::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Kast {
    kast: kast::Kast,
}

#[wasm_bindgen]
impl Kast {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        Self {
            kast: kast::Kast::new().unwrap(),
        }
    }
    pub fn set_output(&mut self, output_fn: js_sys::Function) {
        self.kast.output = std::sync::Arc::new({
            struct PlaygroundOutput(js_sys::Function);
            unsafe impl Send for PlaygroundOutput {}
            unsafe impl Sync for PlaygroundOutput {}
            impl Output for PlaygroundOutput {
                fn write(&self, s: &str) {
                    let _ = self.0.call1(&JsValue::NULL, &JsValue::from_str(s));
                }
            }
            PlaygroundOutput(output_fn)
        });
    }
    pub fn eval(&mut self, source: String) -> Result<(), String> {
        match self.kast.eval_source::<Value>(
            SourceFile {
                contents: source,
                filename: "<source>".into(),
            },
            None,
        ) {
            Ok(value) => {
                let _ = value; // TODO maybe print if not ()
                Ok(())
            }
            Err(e) => Err(format!("{e:?}")),
        }
    }
}

// never use kast
impl Default for Kast {
    fn default() -> Self {
        Self::new()
    }
}
