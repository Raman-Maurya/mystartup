import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateContest = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    entryFee: 10,
    prizePool: 15,
    maxParticipants: 2,
    startDate: '2025-05-21T18:30',
    endDate: '2025-05-21T19:30',
    contestType: 'HEAD2HEAD',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Prepare ISO dates
      const data = {
        ...form,
        entryFee: Number(form.entryFee),
        prizePool: Number(form.prizePool),
        maxParticipants: Number(form.maxParticipants),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };
      const res = await axios.post('/api/contests', data);
      setSuccess('Contest created successfully!');
      setTimeout(() => navigate('/contests'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating contest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Create Contest</h2>
      <form onSubmit={handleSubmit} className="mt-3">
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input type="text" className="form-control" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea className="form-control" name="description" value={form.description} onChange={handleChange} required />
        </div>
        <div className="row">
          <div className="col-md-4 mb-3">
            <label className="form-label">Entry Fee (₹)</label>
            <input type="number" className="form-control" name="entryFee" value={form.entryFee} onChange={handleChange} min="0" required />
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">Prize Pool (₹)</label>
            <input type="number" className="form-control" name="prizePool" value={form.prizePool} onChange={handleChange} min="0" required />
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">Team Size (Max Participants)</label>
            <input type="number" className="form-control" name="maxParticipants" value={form.maxParticipants} onChange={handleChange} min="2" required />
          </div>
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Start Date</label>
            <input type="datetime-local" className="form-control" name="startDate" value={form.startDate} onChange={handleChange} required />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">End Date</label>
            <input type="datetime-local" className="form-control" name="endDate" value={form.endDate} onChange={handleChange} required />
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">Contest Type</label>
          <select className="form-select" name="contestType" value={form.contestType} onChange={handleChange} required>
            <option value="HEAD2HEAD">Head 2 Head</option>
            <option value="PAID">Paid</option>
            <option value="FREE">Free</option>
            <option value="GUARANTEED">Guaranteed</option>
            <option value="WINNER_TAKES_ALL">Winner Takes All</option>
          </select>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Contest'}</button>
      </form>
    </div>
  );
};

export default CreateContest; 