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
      venueType,
      requiresSeatSelection,
    } = req.body;

    // Basic presence validation for required fields
    if (!date || !time) {
      return res.status(400).json({ message: 'Start date and time are required' });
    }

    const startTime = new Date(`${date}T${time}`);
    const finalEndDate = endDate || date;
    const finalEndTime = endTime || time;
    const parsedEndTime = new Date(`${finalEndDate}T${finalEndTime}`);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date/time' });
    }

    if (parsedEndTime <= startTime) {
      return res
        .status(400)
        .json({ message: 'End date/time must be after start date/time' });
    }

    const finalVenueType = venueType || (requiresSeatSelection ? 'indoor' : 'outdoor');

    const event = await Event.create({
      name: title,
      description,
      category,
      location,
      city,
      image: bannerUrl,
      price: price || 0,
      venueType: finalVenueType,
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
      venueType,
      requiresSeatSelection,
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
    if (venueType !== undefined) update.venueType = venueType;
    if (requiresSeatSelection !== undefined && venueType === undefined) {
      update.venueType = requiresSeatSelection ? 'indoor' : 'outdoor';
    }

    // If any date/time related fields are provided, recompute and validate
    if (date || time || endDate || endTime) {
      if (!date || !time) {
        return res
          .status(400)
          .json({ message: 'Start date and time are required when updating' });
      }

      const startTime = new Date(`${date}T${time}`);
      const finalEndDate = endDate || date;
      const finalEndTime = endTime || time;
      const parsedEndTime = new Date(`${finalEndDate}T${finalEndTime}`);

      if (Number.isNaN(startTime.getTime()) || Number.isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({ message: 'Invalid start or end date/time' });
      }

      if (parsedEndTime <= startTime) {
        return res
          .status(400)
          .json({ message: 'End date/time must be after start date/time' });
      }

      update.startTime = startTime;
      update.endTime = parsedEndTime;
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
