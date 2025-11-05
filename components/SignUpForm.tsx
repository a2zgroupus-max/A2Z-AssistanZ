import React, { useState } from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface SignUpFormProps {
  onBack: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onBack }) => {
    const [isBackHovered, setIsBackHovered] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you would handle form submission here.
        alert("Thank you for signing up!");
        onBack();
    };

    return (
        <div className="signup-overlay animate-fade-in">
            <div className="signup-form smoked-glass-pane animate-pop-in">
                <header style={{ flexShrink: 0, marginBottom: '1.5rem' }}>
                    <button 
                        onClick={onBack} 
                        onMouseEnter={() => setIsBackHovered(true)}
                        onMouseLeave={() => setIsBackHovered(false)}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            color: isBackHovered ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            marginBottom: '1rem'
                        }}
                    >
                        <ArrowLeftIcon style={{width: '20px', height: '20px'}} />
                        Back to Homepage
                    </button>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>Start Your 3-Day Free Trial</h1>
                    <p style={{ color: 'var(--color-text-muted)'}}>No commitment, cancel anytime.</p>
                </header>
                <form onSubmit={handleSubmit} className="signup-form-body">
                    <div className="signup-form-grid">
                        <h2 className="form-section-title">Your Information</h2>
                        <div className="form-group">
                            <label htmlFor="firstName">First Name</label>
                            <input type="text" id="firstName" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lastName">Last Name</label>
                            <input type="text" id="lastName" required />
                        </div>
                        <div className="form-group grid-col-span-2">
                            <label htmlFor="address">Street Address</label>
                            <input type="text" id="address" required />
                        </div>
                         <div className="form-group">
                            <label htmlFor="apt">Apt / Suite (Optional)</label>
                            <input type="text" id="apt" />
                        </div>
                         <div className="form-group">
                            <label htmlFor="city">City</label>
                            <input type="text" id="city" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="state">State</label>
                            <input type="text" id="state" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="zip">ZIP Code</label>
                            <input type="text" id="zip" required />
                        </div>
                         <div className="form-group">
                            <label htmlFor="phone">Phone Number</label>
                            <input type="tel" id="phone" required />
                        </div>
                         <div className="form-group">
                            <label htmlFor="dob">Date of Birth</label>
                            <input type="date" id="dob" required />
                        </div>

                        <h2 className="form-section-title">Payment Method</h2>
                        <div className="form-group grid-col-span-2">
                             <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                A valid payment method is required to start your free trial. You will not be charged for 3 days.
                            </p>
                        </div>
                        <div className="form-group grid-col-span-2">
                            <label htmlFor="cardNumber">Card Number</label>
                            <input type="text" id="cardNumber" placeholder="•••• •••• •••• ••••" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="expiry">Expiration Date</label>
                            <input type="text" id="expiry" placeholder="MM / YY" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="cvc">CVC</label>
                            <input type="text" id="cvc" placeholder="•••" required />
                        </div>
                    </div>
                    <footer className="form-footer">
                        <p className="disclaimer-text">
                            By clicking "Start Free Trial", you acknowledge that if you do not cancel within 72 hours, your payment method on file will be charged $49.95 per month. You can cancel anytime. This is a recurring charge.
                        </p>
                        <button type="submit" className="btn btn-primary" style={{width: '100%', padding: '1rem', fontSize: '1rem'}}>
                            Start Free Trial
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default SignUpForm;