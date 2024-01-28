use crate::error_template::{AppError, ErrorTemplate};

use leptos::*;
use leptos_meta::*;
use leptos_router::*;
use thaw::*;

mod guide;

use crate::components::CodeBlock;

use guide::GettingStarted;

#[component]
pub fn App() -> impl IntoView {
    provide_meta_context();

    view! {
        <Stylesheet id="leptos" href="/pkg/rue-web.css"/>
        <Title text="Rue Lang"/>

        <Router fallback=|| {
            let mut outside_errors = Errors::default();
            outside_errors.insert_with_default_key(AppError::NotFound);
            view! { <ErrorTemplate outside_errors/> }.into_view()
        }>
            <ThemeProvider theme=Theme::dark()>
                <GlobalStyle/>
                <nav>
                    <Nav/>
                </nav>
                <main>
                    <Routes>
                        <Route path="" view=HomePage/>
                        <Route path="guide" view=GettingStarted/>
                    </Routes>
                </main>

            </ThemeProvider>
        </Router>
    }
}

#[component]
fn Nav() -> impl IntoView {
    view! {
        <Button
            variant=ButtonVariant::Text
            on_click=move |_| {
                let navigate = use_navigate();
                navigate("/", Default::default());
            }
        >

            "Home"
        </Button>
        <Button
            variant=ButtonVariant::Text
            on_click=move |_| {
                let navigate = use_navigate();
                navigate("/guide", Default::default());
            }
        >

            "Guide"
        </Button>
    }
}

#[component]
fn HomePage() -> impl IntoView {
    let hello_world = include_str!("../snippets/hello_world.rue").to_string();

    view! {
        <Space vertical=true>
            <CodeBlock source=hello_world/>
        </Space>
    }
}
