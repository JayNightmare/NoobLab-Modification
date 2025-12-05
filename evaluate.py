import os
import json
from azure.ai.evaluation import evaluate, RelevanceEvaluator
from azure.ai.evaluation import AzureOpenAIModelConfiguration


# Define custom code-based evaluators
class CodeExecutionAccuracyEvaluator:
    def __init__(self):
        pass

    def __call__(self, *, actual_output: str, expected_output: str, **kwargs):
        # Simple exact match for now, could be enhanced with regex or fuzzy matching
        is_correct = actual_output.strip() == expected_output.strip()
        return {"accuracy": 1.0 if is_correct else 0.0}


class ResponseTimeEvaluator:
    def __init__(self):
        pass

    def __call__(self, *, execution_time_ms: int, **kwargs):
        # Example threshold: < 200ms is good (1.0), > 500ms is bad (0.0)
        score = 1.0
        if execution_time_ms > 500:
            score = 0.0
        elif execution_time_ms > 200:
            score = 0.5
        return {"response_time_score": score}


def main():
    # Load configuration from environment variables
    # Ensure you have set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT
    model_config = AzureOpenAIModelConfiguration(
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT"),
    )

    # Initialize evaluators
    accuracy_evaluator = CodeExecutionAccuracyEvaluator()
    response_time_evaluator = ResponseTimeEvaluator()

    # Relevance evaluator for feedback (using built-in AI-assisted evaluator)
    # Note: This requires the 'response' field which we are simulating with 'actual_output'
    relevance_evaluator = RelevanceEvaluator(model_config)

    # Prepare data file (convert json to jsonl if needed, but evaluate supports jsonl)
    # We will create a temporary jsonl file from our existing json
    data_file = "evaluation_data.jsonl"
    with open("evaluation_responses.json", "r") as f:
        data = json.load(f)

    # Merge expected output from queries if needed, but here we assume responses.json has it all
    # Actually, we need to merge expected_output from queries.json if it's not in responses.json
    # But for this example, we put 'actual_output' in responses.json.
    # Let's assume we need to merge them.
    with open("evaluation_queries.json", "r") as f:
        queries = json.load(f)

    # Create a merged dataset
    merged_data = []
    for q, r in zip(queries, data):
        item = {
            "query": q["query"],
            "expected_output": q["expected_output"],
            "actual_output": r["actual_output"],
            "execution_time_ms": r["execution_time_ms"],
        }
        merged_data.append(item)

    with open(data_file, "w") as f:
        for item in merged_data:
            f.write(json.dumps(item) + "\n")

    # Run evaluation
    result = evaluate(
        data=data_file,
        evaluators={
            "accuracy": accuracy_evaluator,
            "response_time": response_time_evaluator,
            "relevance": relevance_evaluator,
        },
        evaluator_config={
            "accuracy": {
                "column_mapping": {
                    "actual_output": "${data.actual_output}",
                    "expected_output": "${data.expected_output}",
                }
            },
            "response_time": {
                "column_mapping": {"execution_time_ms": "${data.execution_time_ms}"}
            },
            "relevance": {
                "column_mapping": {
                    "query": "${data.query}",
                    "response": "${data.actual_output}",  # Using actual output as response for relevance check
                }
            },
        },
        output_path="./evaluation_results.json",
    )

    print("Evaluation complete. Results saved to evaluation_results.json")
    # print(result) # Optional: print summary


if __name__ == "__main__":
    main()
