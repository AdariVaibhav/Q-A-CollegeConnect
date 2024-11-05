import React, { useState } from 'react';
import axios from 'axios';

const Reply = ({ answerId, onAddReply }) => {
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('content', content);
        if (file) formData.append('file', file);

        try {
            const response = await axios.post(`http://localhost:5000/api/answers/${answerId}/reply`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true,
            });
            onAddReply(response.data);
            setContent('');
            setFile(null);
            setError('');
        } catch (error) {
            console.error('Error adding reply:', error);
            setError(error.response?.data?.message || 'Error adding reply');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add a reply"
                required
            ></textarea>
            <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
            />
            <button type="submit">Reply</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
    );
};

export default Reply;
