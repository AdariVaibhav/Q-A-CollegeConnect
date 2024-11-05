import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AddQuestion from './AddQuestion';
import Question from './Question';

const Dashboard = () => {
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');

    const fetchQuestions = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/questions', { withCredentials: true });
            setQuestions(response.data);
            setError('');
        } catch (error) {
            console.error('Error fetching questions:', error);
            setError(error.response?.data?.message || 'Error fetching questions');
        }
    };

    const handleAddQuestion = (newQuestion) => setQuestions((prev) => [...prev, newQuestion]);

    const handleUpvoteQuestion = async (questionId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/questions/${questionId}/upvote`, { method: 'POST', credentials: 'include' });
            const updatedQuestion = await response.json();
            setQuestions((prevQuestions) =>
                prevQuestions.map((question) =>
                    question._id === questionId ? { ...question, upvotes: updatedQuestion.upvotes } : question
                )
            );
        } catch (error) {
            console.error('Error toggling upvote:', error);
        }
    };

    const handleAddAnswer = (questionId, newAnswer) => {
        setQuestions((prev) =>
            prev.map((q) =>
                q._id === questionId ? { ...q, answers: [...q.answers, newAnswer] } : q
            )
        );
    };

    // Update the answer state with the new upvote count
    const handleUpdateAnswer = (questionId, updatedAnswer) => {
        setQuestions((prevQuestions) =>
            prevQuestions.map((question) =>
                question._id === questionId
                    ? {
                          ...question,
                          answers: question.answers.map((answer) =>
                              answer._id === updatedAnswer._id 
                                  ? { ...answer, upvotes: updatedAnswer.upvotes } 
                                  : answer
                          ),
                      }
                    : question
            )
        );
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const filteredQuestions = questions
        .filter((question) => question.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            switch (sortOption) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'highest-upvotes':
                    return b.upvotes - a.upvotes;
                case 'lowest-upvotes':
                    return a.upvotes - b.upvotes;
                default:
                    return 0;
            }
        });

    return (
        <div>
            <h1>Q/A</h1>
            <AddQuestion onAddQuestion={handleAddQuestion} />
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest-upvotes">Highest Upvotes</option>
                <option value="lowest-upvotes">Lowest Upvotes</option>
            </select>

            <ul>
                {filteredQuestions.map((question) => (
                    <Question 
                        key={question._id} 
                        question={question} 
                        onUpvote={() => handleUpvoteQuestion(question._id)} 
                        onAddAnswer={handleAddAnswer} 
                        onUpdateAnswer={handleUpdateAnswer} // Pass the update function here
                    />
                ))}
            </ul>
        </div>
    );
};

export default Dashboard;
