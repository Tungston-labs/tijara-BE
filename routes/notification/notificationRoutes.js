router.get("/notifications", authMiddleware, async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 });

  res.json(notifications);
});
