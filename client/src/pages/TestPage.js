import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import testService from "../services/testService";

const TestPage = () => {
  const { id } = useParams();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await testService.getTest(id);
        setTest(response.data);
      } catch (err) {
        setError("Failed to load test.");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id]);

  const handleAnswerChange = (questionId, answer_id, answer_text) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { answer_id, answer_text },
    }));
  };

  const handleSubmit = async () => {
    try {
      const formattedAnswers = Object.keys(answers).map((question_id) => ({
        question_id,
        answer_id: answers[question_id].answer_id,
        answer_text: answers[question_id].answer_text,
      }));
      await testService.submitTest(id, formattedAnswers);
      alert("Test submitted successfully!");
    } catch (err) {
      alert("Failed to submit test.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>{test.name}</h1>
      <p>{test.description}</p>
      {test.sections.map((section) => (
        <div key={section.id}>
          <h2>{section.type}</h2>
          {section.questions.map((question) => (
            <div key={question.id}>
              <p>{question.question_text}</p>
              <input
                type="text"
                onChange={(e) => handleAnswerChange(question.id, 1, e.target.value)}
              />
            </div>
          ))}
        </div>
      ))}
      <button onClick={handleSubmit}>Submit Test</button>
    </div>
  );
};

export default TestPage;
