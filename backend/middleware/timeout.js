// Request timeout middleware

// General API timeout - 30 seconds
export const apiTimeout = (req, res, next) => {
  req.setTimeout(30000);
  next();
};

// Upload timeout - 5 minutes (300 seconds)
export const uploadTimeout = (req, res, next) => {
  req.setTimeout(300000);
  next();
};

// Socket timeout - 60 seconds
export const socketTimeout = (socket, next) => {
  socket.handshake.issued = Date.now();
  socket.conn.setReadyState('open');

  const timeout = setTimeout(() => {
    socket.emit('error', 'Connection timeout');
    socket.disconnect(true);
  }, 60000);

  socket.on('disconnect', () => {
    clearTimeout(timeout);
  });

  next();
};

// Response timeout middleware
export const responseTimeout = (ms = 30000) => {
  return (req, res, next) => {
    let timeoutHandle;

    res.on('finish', () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });

    res.on('close', () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });

    timeoutHandle = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Request timeout - server did not respond in time',
        });
      }
    }, ms);

    next();
  };
};

// Timeout error handler
export const timeoutErrorHandler = (err, req, res, next) => {
  if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
    return res.status(408).json({
      success: false,
      error: 'Request timeout - please try again',
    });
  }
  next(err);
};
