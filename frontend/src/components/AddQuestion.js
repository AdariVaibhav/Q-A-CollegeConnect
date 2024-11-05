import React, { useState } from 'react';
import axios from 'axios';

const AddQuestion = ({ onAddQuestion }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/api/questions', { title, content }, { withCredentials: true });
            onAddQuestion(response.data);
            setTitle('');
            setContent('');
            setError('');
        } catch (error) {
            console.error('Error adding question:', error);
            setError(error.response?.data?.message || 'Error adding question');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Question Title"
                required
            />
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Question Content"
                required
            ></textarea>
            <button type="submit">Add Question</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
    );
};

export default AddQuestion;
