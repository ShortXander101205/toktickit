# Lab 1 — AI Use and Reflection

**LLM/agent used:** Antigravity IDE Agent / Gemini

## Selected key prompts (6–10)

| #   | Prompt (summarised)                                                                                                                               | What I did with the result                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Simple, unstructured prompt asking the agent to provide a roadmap for Issue 1, pending my approval.                                               | Reviewed the roadmap, verified it met the basic criteria, and approved it for code generation.           |
| 2   | Detailed but short structured prompt for Issue 2. Asked for the agent's plan before approving the implementation.                                 | Checked the plan to ensure no unnecessary changes were made, then explicitly approved it.                |
| 3   | Structured prompt for Issue 3 with specific formatting rules, asking to verify if it is the right implementation.                                 | Verified the Prisma models and seeding logic matched the engineering contract, then executed.            |
| 4   | Highly structured prompt for Issue 4 asking for expected outputs, a roadmap, and an evaluation against the issue criteria before generating code. | Reviewed the file-by-file plan to ensure it strictly met the Issue 4 scope, then approved the execution. |
| 5   | Asked the agent to check the final test protocols and outline the evidence required for the Lab 1 report.                                         | Used the checklist to verify all tests were passing and to structure my final test documentation.        |
| 6   | Prompted for a final verdict by asking the agent to review all completed documentation files against the lab sheet rubrics.                       | Addressed the missing details identified (like PR links and test results) before finalizing the PDF.     |

## Reflection

Prompting with random words like I am talking to a person does not give the best outcome; I learned to create structured formats that align with our lab work so the AI doesn't get jumbled. I also learned not to blindly approve work—I need to see and understand the plans to verify they are correct before execution. One place I had to correct the agent's direction was making sure to separate out-of-scope tasks (like README updates) from the strict feature implementations so my branches stayed clean.
