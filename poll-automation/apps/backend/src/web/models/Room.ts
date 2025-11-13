import mongoose, { Document, Schema } from 'mongoose';

export type QuestionSource = 'manual' | 'ai';
export type QuestionStatus = 'pending' | 'approved' | 'rejected';

export interface RoomSettings {
  questionFrequencyMinutes: number;
  questionsPerPoll: number;
  visibilityMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface AiSettings {
  autoLaunch: boolean;
  defaultTimer: number;
  enableNotifications: boolean;
  aiConfidenceThreshold: number;
  autoApproveHighConfidence: boolean;
  enableSmartFiltering: boolean;
}

export interface RoomQuestion {
  _id: mongoose.Types.ObjectId;
  text: string;
  options: string[];
  correctAnswerIndex?: number;
  source: QuestionSource;
  status: QuestionStatus;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category?: string;
  timeLimit: number;
  points: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface RoomDocument extends Document {
  code: string;
  name: string;
  hostName?: string;
  status: 'active' | 'ended';
  participants: number;
  expiresAt?: Date;
  settings: RoomSettings;
  aiSettings: AiSettings;
  questions: RoomQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const roomQuestionSchema = new Schema<RoomQuestion>({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswerIndex: { type: Number },
  source: { type: String, enum: ['manual', 'ai'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  category: { type: String },
  timeLimit: { type: Number, default: 30 },
  points: { type: Number, default: 100 },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

const roomSchema = new Schema<RoomDocument>({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true },
  name: { type: String, required: true },
  hostName: { type: String },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  participants: { type: Number, default: 0 },
  expiresAt: { type: Date },
  settings: {
    questionFrequencyMinutes: { type: Number, default: 5 },
    questionsPerPoll: { type: Number, default: 3 },
    visibilityMinutes: { type: Number, default: 5 },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  },
  aiSettings: {
    autoLaunch: { type: Boolean, default: false },
    defaultTimer: { type: Number, default: 30 },
    enableNotifications: { type: Boolean, default: true },
    aiConfidenceThreshold: { type: Number, default: 80 },
    autoApproveHighConfidence: { type: Boolean, default: false },
    enableSmartFiltering: { type: Boolean, default: true },
  },
  questions: [roomQuestionSchema],
}, { timestamps: true });

export default mongoose.model<RoomDocument>('Room', roomSchema);
