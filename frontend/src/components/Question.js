import React from 'react';
import AddAnswer from './AddAnswer';

const Question = ({ question, onUpvote, onAddAnswer, onUpdateAnswer }) => {
    const handleAddAnswer = (newAnswer) => {
        onAddAnswer(question._id, newAnswer);
    };

    // Function to handle upvoting an answer
    const handleAnswerUpvote = async (answer) => {
        // Optimistically update the answer's upvotes in local state
        const updatedAnswer = { ...answer, upvotes: answer.upvotes + 1 };
        
        // Here we assume the API expects answer._id to identify which answer to upvote
        onUpdateAnswer(question._id, updatedAnswer); // Update local state immediately
        
        try {
            const response = await fetch(`http://localhost:5000/api/answers/${answer._id}/upvote`, { 
                method: 'POST', 
                credentials: 'include' 
            });

            if (response.ok) {
                const resData = await response.json();
                // Update the local state with the actual server response
                onUpdateAnswer(question._id, { ...updatedAnswer, upvotes: resData.upvotes });
            } else {
                console.error('Error upvoting answer:', response.statusText);
            }
        } catch (error) {
            console.error('Error upvoting answer:', error);
        }
    };

    const sortedAnswers = [...question.answers].sort((a, b) => b.upvotes - a.upvotes);

    return (
        <li>
            <h2>{question.title}</h2>
            <p>{question.content}</p>
            <p>Upvotes: {question.upvotes}</p>
            <button onClick={onUpvote}>Upvote</button>
            <AddAnswer questionId={question._id} onAddAnswer={handleAddAnswer} />
            <h3>Answers:</h3>
            {sortedAnswers.map((answer) => (
                <div key={answer._id}>
                    <p>{answer.content}</p>
                    <p>Upvotes: {answer.upvotes}</p>
                    <button onClick={() => handleAnswerUpvote(answer)}>Upvote</button>
                </div>
            ))}
        </li>
    );
};

export default Question;
