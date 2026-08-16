import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { checkSystem } from "./api.js";
export default function App() {
    const [state, setState] = useState("idle");
    const [categories, setCategories] = useState([]);
    async function handleCheck() {
        setState("loading");
        try {
            const result = await checkSystem();
            setCategories(result.categories);
            setState("success");
        }
        catch (err) {
            setState("error");
        }
    }
    return (_jsxs("div", { className: "container py-5", style: { maxWidth: 640 }, children: [_jsxs("h1", { className: "h3 mb-4", children: ["TokTickIT ", _jsx("span", { className: "text-success", children: "IT Service Desk" })] }), _jsx("button", { className: "btn btn-success", onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Loading…" : "Check System" }), _jsxs("div", { className: "mt-4", children: [state === "success" && (_jsxs("div", { children: [_jsx("p", { children: "System Status: Online" }), _jsx("ul", { className: "list-group mt-3", children: categories.map((category) => (_jsx("li", { className: "list-group-item", children: category.name }, category.id))) })] })), state === "error" && (_jsxs("div", { className: "alert alert-danger", children: [_jsx("p", { className: "mb-0", children: "System Status: Offline" }), _jsx("small", { children: "Unable to connect to TokTickIT API" })] }))] })] }));
}
