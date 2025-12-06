import React, { useState, useEffect } from "react";
import testService from "../services/testService";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await testService.getAllTests();
        setTests(response.data);
      } catch (err) {
        setError("Failed to load tests.");
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>Available Tests</h1>
      <ul>
        {tests.map((test) => (
          <li key={test.id}>
            <Link to={`/tests/${test.id}`}>
              <h2>{test.name}</h2>
              <p>{test.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
