const Event = require('../models/Event');

exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      date,
      time,
      endDate,
      endTime,
      location,
      city,
      capacity,
      bannerUrl,
      tags,
      status,
      price,
    } = req.body;

    const startTime = new Date(`${date}T${time || '00:00'}`);
    const finalEndDate = endDate || date;
    const finalEndTime = endTime || time || '00:00';
    const parsedEndTime = new Date(`${finalEndDate}T${finalEndTime}`);

    const event = await Event.create({
      name: title,
      description,
      category,
      location,
      city,
      image: bannerUrl,
      price: price || 0,
      startTime,
      endTime: parsedEndTime,
      capacity,
      tags: Array.isArray(tags) ? tags : [],
      status: status || 'draft',
    });
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    next(err);
  }
};

exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      date,
      time,
      endDate,
      endTime,
      location,
      city,
      capacity,
      bannerUrl,
      tags,
      status,
      price,
    } = req.body;

    const update = {};
    if (title !== undefined) update.name = title;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (location !== undefined) update.location = location;
    if (city !== undefined) update.city = city;
    if (bannerUrl !== undefined) update.image = bannerUrl;
    if (price !== undefined) update.price = price;
    if (capacity !== undefined) update.capacity = capacity;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
    if (status !== undefined) update.status = status;

    if (date && time) {
      update.startTime = new Date(`${date}T${time}`);
    }
    if (endDate && (endTime || time)) {
      update.endTime = new Date(`${endDate}T${endTime || time}`);
    }

    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    next(err);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};
