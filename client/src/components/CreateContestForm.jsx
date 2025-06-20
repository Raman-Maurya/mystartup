<Form.Group className="mb-3">
  <Form.Label>Maximum Participants</Form.Label>
  <Form.Control 
    type="number" 
    placeholder="Enter maximum participants" 
    name="maxParticipants"
    value={formData.maxParticipants} 
    onChange={handleChange}
    min="10"
    max="200"
    required
  />
  <Form.Text className="text-muted">
    Set a limit between 10-200 participants. New contests are automatically created when this fills up.
  </Form.Text>
</Form.Group> 