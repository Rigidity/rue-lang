use leptos::*;
use thaw::*;

use super::highlight::Highlight;

#[component]
pub fn CodeBlock(source: String) -> impl IntoView {
    view! {
        <Card>
            <pre class="code-block">
                <Highlight source=source/>
            </pre>
        </Card>
    }
}
