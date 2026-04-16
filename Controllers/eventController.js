const Event = require('../Models/Event');

// Get all events
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get the currently active event
exports.getActiveEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .populate('offers.productId');
    
    if (!event) {
      return res.status(404).json({ message: "No active event found" });
    }
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const eventData = req.body;
    
    // If this new event is set to active, deactivate all others
    if (eventData.isActive === true) {
      await Event.updateMany({}, { isActive: false });
    }

    const newEvent = new Event(eventData);
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If setting this event to active, deactivate all others
    if (updateData.isActive === true) {
      await Event.updateMany({ _id: { $ne: id } }, { isActive: false });
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await Event.findByIdAndDelete(id);
    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle active status
exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const newStatus = !event.isActive;

    if (newStatus === true) {
      await Event.updateMany({}, { isActive: false });
    }

    event.isActive = newStatus;
    await event.save();

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
