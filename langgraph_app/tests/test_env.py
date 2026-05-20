import os


def test_print_model_phi3() -> None:
    print(os.environ.get("MODEL_PHI3"))
    assert True
