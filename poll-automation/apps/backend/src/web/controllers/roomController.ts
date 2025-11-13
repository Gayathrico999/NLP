import { Request, Response } from 'express';
import mongoose from 'mongoose';
import RoomModel, { RoomDocument, RoomQuestion, QuestionStatus } from '../models/Room';

const normalizeRoomCode = (code: string): string => {
  if (!code) {
    return '';
  }
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

const formatRoomCode = (code: string): string => {
  if (!code) {
    return '';
  }
  const normalized = normalizeRoomCode(code);
  if (normalized.length <= 3) {
    return normalized;
  }
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}`;
};

const generateRoomCode = async (): Promise<string> => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  while (attempts < 10) {
    let candidate = '';
    for (let i = 0; i < 6; i += 1) {
      candidate += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
     
    const exists = await RoomModel.exists({ code: candidate });
    if (!exists) {
      return candidate;
    }
    attempts += 1;
  }
  throw new Error('Unable to generate unique room code');
};

const getActiveRoom = async (code: string): Promise<RoomDocument | null> => {
  const normalized = normalizeRoomCode(code);
  const direct = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const hyphenated = direct.includes('-') ? direct.replace(/-/g, '') : '';
  const variations = Array.from(new Set([normalized, direct, hyphenated].filter((value) => value)));
  if (variations.length === 0) {
    return null;
  }
  return RoomModel.findOne({ status: 'active', code: { $in: variations } });
};

const mapSettings = (payload: Partial<RoomDocument['settings']> | undefined) => ({
  questionFrequencyMinutes: payload?.questionFrequencyMinutes ?? 5,
  questionsPerPoll: payload?.questionsPerPoll ?? 3,
  visibilityMinutes: payload?.visibilityMinutes ?? 5,
  difficulty: payload?.difficulty ?? 'Medium',
});

const mapAiSettings = (payload: Partial<RoomDocument['aiSettings']> | undefined) => ({
  autoLaunch: payload?.autoLaunch ?? false,
  defaultTimer: payload?.defaultTimer ?? 30,
  enableNotifications: payload?.enableNotifications ?? true,
  aiConfidenceThreshold: payload?.aiConfidenceThreshold ?? 80,
  autoApproveHighConfidence: payload?.autoApproveHighConfidence ?? false,
  enableSmartFiltering: payload?.enableSmartFiltering ?? true,
});

export const createOrUpdateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomName, roomCode, hostName, settings, aiSettings, durationMinutes, expiresAt } = req.body;

    if (!roomName) {
      res.status(400).json({ message: 'roomName is required' });
      return;
    }

    let normalizedCode = normalizeRoomCode(roomCode ?? '');
    if (!normalizedCode) {
      normalizedCode = await generateRoomCode();
    }

    let room = await RoomModel.findOne({ code: normalizedCode });

    if (!room) {
      room = new RoomModel({
        code: normalizedCode,
        name: roomName,
        hostName,
        status: 'active',
        settings: mapSettings(settings),
        aiSettings: mapAiSettings(aiSettings),
      });
    } else {
      if (room.status === 'ended') {
        room.status = 'active';
        room.questions = [];
      }
      room.name = roomName;
      room.hostName = hostName ?? room.hostName;
      room.settings = mapSettings({ ...room.settings, ...settings });
      room.aiSettings = mapAiSettings({ ...room.aiSettings, ...aiSettings });
    }

    room.code = normalizedCode;

    if (typeof durationMinutes === 'number' && durationMinutes > 0) {
      const expiration = new Date();
      expiration.setMinutes(expiration.getMinutes() + durationMinutes);
      room.expiresAt = expiration;
    }

    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      if (!Number.isNaN(expirationDate.getTime())) {
        room.expiresAt = expirationDate;
      }
    }

    await room.save();

    res.status(201).json({
      roomCode: formatRoomCode(room.code),
      roomName: room.name,
      status: room.status,
      settings: room.settings,
      aiSettings: room.aiSettings,
      expiresAt: room.expiresAt,
      questionCount: room.questions.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create room', error });
  }
};

export const getRoomDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const room = await getActiveRoom(code);
    if (!room) {
      res.status(404).json({ message: 'Room not found or inactive' });
      return;
    }

    res.json({
      roomCode: formatRoomCode(room.code),
      roomName: room.name,
      hostName: room.hostName,
      participants: room.participants,
      status: room.status,
      settings: room.settings,
      aiSettings: room.aiSettings,
      expiresAt: room.expiresAt,
      questionsAvailable: room.questions.filter((q) => q.status === 'approved').length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch room', error });
  }
};

export const getRoomQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const { status } = req.query;
    const room = await getActiveRoom(code);
    if (!room) {
      res.status(404).json({ message: 'Room not found or inactive' });
      return;
    }

    const statusFilter = typeof status === 'string' ? status : 'approved';
    console.log('Fetching questions:', {
      roomCode: room.code,
      statusFilter,
      totalQuestions: room.questions.length,
      approvedQuestions: room.questions.filter(q => q.status === 'approved').length,
      manualQuestions: room.questions.filter(q => q.source === 'manual').length,
    });
    
    const questions = room.questions
      .filter((question) => (statusFilter === 'all' ? true : question.status === statusFilter))
      .map((question) => {
        const plainQuestion = (
          typeof (question as any)?.toObject === 'function'
            ? (question as any).toObject()
            : { ...question }
        ) as RoomQuestion & Record<string, unknown>;

        return {
          ...plainQuestion,
          roomMetadata: {
            roomCode: formatRoomCode(room.code),
            roomName: room.name,
            hostName: room.hostName,
            aiEnabled: room.aiSettings.autoLaunch,
            questionFrequency: room.settings.questionFrequencyMinutes,
          },
        };
      });

    res.json({
      roomCode: formatRoomCode(room.code),
      roomName: room.name,
      participants: room.participants,
      status: room.status,
      settings: room.settings,
      aiSettings: room.aiSettings,
      questions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch questions', error });
  }
};

const buildManualQuestion = (payload: Record<string, unknown>): Omit<RoomQuestion, '_id'> => {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const timerEnabled = Boolean(payload.timerEnabled);
  const timerDuration = typeof payload.timerDuration === 'number' ? payload.timerDuration : 30;
  const timerUnit = payload.timerUnit === 'minutes' ? 'minutes' : 'seconds';
  const optionsPayload = Array.isArray(payload.options) ? payload.options : [];
  const options = optionsPayload
    .map((opt) => {
      if (opt && typeof opt === 'object' && 'text' in opt) {
        const value = String(opt.text).trim();
        return value;
      }
      return '';
    })
    .filter((text) => text);
  const correctAnswer = typeof payload.correctAnswer === 'string' ? payload.correctAnswer.trim() : undefined;
  const correctIndex = correctAnswer
    ? options.findIndex((option) => option.toLowerCase() === correctAnswer.toLowerCase())
    : undefined;
  const type = typeof payload.types === 'string' ? payload.types : 'mcq';
  const shortAnswerPlaceholder = typeof payload.shortAnswerPlaceholder === 'string'
    ? payload.shortAnswerPlaceholder.trim()
    : undefined;

  const timeLimit = timerEnabled
    ? timerUnit === 'minutes'
      ? timerDuration * 60
      : timerDuration
    : 30;

  const metadata: Record<string, unknown> = { type };
  if (type === 'shortanswer' && shortAnswerPlaceholder) {
    metadata.placeholder = shortAnswerPlaceholder;
  }

  return {
    text: title,
    options,
    correctAnswerIndex: typeof correctIndex === 'number' && correctIndex >= 0 ? correctIndex : undefined,
    source: 'manual',
    status: 'approved',
    difficulty: 'Medium',
    category: type,
    timeLimit,
    points: 100,
    metadata,
    createdAt: new Date(),
  } as Omit<RoomQuestion, '_id'>;
};

export const addManualQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const room = await getActiveRoom(code);
    if (!room) {
      res.status(404).json({ message: 'Room not found or inactive' });
      return;
    }

    const question = buildManualQuestion(req.body ?? {});
    const metadata = (question.metadata ?? {}) as Record<string, unknown>;
    const metadataType = typeof metadata.type === 'string' ? String(metadata.type) : undefined;
    const requiresOptions = metadataType !== 'shortanswer';
    if (!question.text || (requiresOptions && question.options.length === 0)) {
      res.status(400).json({ message: 'Invalid question payload' });
      return;
    }

    // Ensure the question is approved and immediately visible
    question.status = 'approved';
    
    // Add to room's questions array
    room.questions.push(question as RoomQuestion);
    await room.save();

    const added = room.questions[room.questions.length - 1];
    console.log('Added manual question:', {
      questionId: added._id,
      roomCode: room.code,
      text: added.text,
      status: added.status,
      options: added.options,
    });

    res.status(201).json({
      questionId: added._id,
      roomCode: formatRoomCode(room.code),
      question: added,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add manual question', error });
  }
};

export const addAiQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const room = await getActiveRoom(code);
    if (!room) {
      res.status(404).json({ message: 'Room not found or inactive' });
      return;
    }

    const payload: unknown[] = Array.isArray(req.body?.questions)
      ? req.body.questions
      : req.body?.questions
        ? [req.body.questions]
        : [];
    if (payload.length === 0) {
      res.status(400).json({ message: 'No AI questions provided' });
      return;
    }

    const added: RoomQuestion[] = [];

    payload.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      const source = item as Record<string, unknown>;
      const textValue = source.question;
      const text = typeof textValue === 'string' ? textValue.trim() : '';
      const optionsRaw = source.options;
      const options = Array.isArray(optionsRaw)
        ? optionsRaw.filter((opt): opt is string => typeof opt === 'string').map((opt) => opt.trim())
        : [];
      if (!text || options.length === 0) {
        return;
      }
      const correctValue = source.correctAnswerIndex;
      const correctAnswerIndex = typeof correctValue === 'number' ? correctValue : undefined;
      const difficultyValue = source.difficulty;
      const difficulty = difficultyValue === 'Easy' || difficultyValue === 'Hard' ? difficultyValue : 'Medium';
      const statusValue = source.status;
      const baseStatus: QuestionStatus = statusValue === 'approved' || statusValue === 'rejected' ? statusValue : 'pending';
      const confidence = typeof source.confidence === 'number' ? source.confidence : undefined;
      let status: QuestionStatus = baseStatus;
      if (status === 'pending') {
        if (room.aiSettings.autoApproveHighConfidence && typeof confidence === 'number' && confidence >= room.aiSettings.aiConfidenceThreshold) {
          status = 'approved';
        } else if (room.aiSettings.autoLaunch) {
          status = 'approved';
        }
      }

      const newQuestion = {
        text,
        options,
        correctAnswerIndex,
        source: 'ai',
        status,
        difficulty,
        category: typeof source.category === 'string' ? source.category : undefined,
        timeLimit: typeof source.timeLimit === 'number' ? source.timeLimit : room.aiSettings.defaultTimer,
        points: typeof source.points === 'number' ? source.points : 100,
        metadata: {
          confidence,
        },
        createdAt: new Date(),
      };
      room.questions.push(newQuestion as unknown as RoomQuestion);
      added.push(room.questions[room.questions.length - 1]);
    });

    if (added.length === 0) {
      res.status(400).json({ message: 'AI payload did not contain valid questions' });
      return;
    }

    await room.save();

    res.status(201).json({
      roomCode: formatRoomCode(room.code),
      questions: added,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add AI questions', error });
  }
};

export const updateQuestionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, questionId } = req.params;
    const { status } = req.body;
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }

    const room = await getActiveRoom(code);
    if (!room) {
      res.status(404).json({ message: 'Room not found or inactive' });
      return;
    }

    const questionIndex = room.questions.findIndex(q => q._id?.toString() === questionId);
    if (questionIndex === -1) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }
    const question = room.questions[questionIndex];

    question.status = status;
    await room.save();

    res.json({
      questionId: question._id,
      status: question.status,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update question status', error });
  }
};

export const updateRoomStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const { status } = req.body;
    if (!status || !['active', 'ended'].includes(status)) {
      res.status(400).json({ message: 'Invalid room status' });
      return;
    }

    const normalized = normalizeRoomCode(code);
    const room = await RoomModel.findOne({ code: normalized });
    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    room.status = status;
    await room.save();

    res.json({
      roomCode: formatRoomCode(room.code),
      status: room.status,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update room status', error });
  }
};

export const deleteQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, questionId } = req.params;
    const room = await getActiveRoom(code);
    if (!room) {
      res.status(404).json({ message: 'Room not found or inactive' });
      return;
    }

    const questionIndex = room.questions.findIndex(q => q._id?.toString() === questionId);
    if (questionIndex === -1) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }
    const question = room.questions[questionIndex];

    // Remove question at index
    room.questions.splice(questionIndex, 1);
    await room.save();

    res.json({ 
      message: 'Question removed',
      roomCode: formatRoomCode(room.code),
      questionId 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove question', error });
  }
};

export const helpers = {
  normalizeRoomCode,
  formatRoomCode,
};
