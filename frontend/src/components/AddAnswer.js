// AddAnswer.js
import React, { useState } from 'react';
import axios from 'axios';

const AddAnswer = ({ questionId, onAddAnswer }) => {
    const [content, setContent] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`http://localhost:5000/api/answers/${questionId}`, { content }, { withCredentials: true });
            onAddAnswer(response.data); // Notify parent component of new answer
            setContent(''); // Clear input
        } catch (error) {
            console.error('Error adding answer:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your answer here..."
                required
            />
            <button type="submit">Submit Answer</button>
        </form>
    );
};

export default AddAnswer;
